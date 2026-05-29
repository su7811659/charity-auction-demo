import os
import faiss
import re
import numpy as np
from sqlalchemy.orm import Session
from schemas.like_schema import Like
from schemas.comment_schema import Comment
from openai import OpenAI
from config import settings
from repositories.product_repository import get_approved_products, get_approved_product_by_id
from services.langchain_service import extract_conditions_with_langchain
from viewmodels.product_viewmodel import ProductViewModel
from utils.logger import Logger
from utils.product_formatter import ProductFormatter

logger = Logger.get_logger(logger_name="FAISS Service")

client = OpenAI(api_key=settings.OPENAI_API_KEY)

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize FAISS index
dimension = 1536  # Embedding size for text-embedding-ada-002
index_path = os.path.join(DATA_DIR, "faiss_index.bin")

# Attempt to load the index from disk
if os.path.exists(index_path):
    index = faiss.read_index(index_path)
    logger.info(f"FAISS index loaded from {index_path}")
else:
    # Use IndexIDMap to support ID-based management
    index = faiss.IndexIDMap(faiss.IndexFlatL2(dimension))
    logger.info("No existing FAISS index found. Initialized a new index.")

# Function to generate embeddings
def generate_embedding(text: str) -> np.ndarray:
    # Demo 模式：未設定真實 OpenAI key 時回傳零向量，不呼叫 OpenAI
    from services.ai_demo import ai_enabled
    if not ai_enabled():
        return np.zeros(dimension, dtype=np.float32)

    response = client.embeddings.create(input=text, model="text-embedding-ada-002")
    return np.array(response.data[0].embedding, dtype=np.float32)

# Populate FAISS index
def populate_faiss_index(db: Session, batch_size=100):
    """
    Populate the FAISS index with embeddings from the database.
    Avoid adding duplicate embeddings.
    """
    try:
        products = get_approved_products(db)

        # Check existing IDs in the FAISS index (only for IndexIDMap)
        existing_ids = set()
        if isinstance(index, faiss.IndexIDMap):
            id_array = faiss.vector_to_array(index.id_map)  # Correct way to access IDs
            logger.debug(f"Existing IDs in FAISS index: {id_array}")
            existing_ids = set(id_array)

        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            for product in batch:
                if product.id in existing_ids:
                    logger.info(f"Product ID {product.id} already exists in the FAISS index. Skipping.")
                    continue

                # Combine product fields into a single text
                text = ProductFormatter.format(product, "langchain_context")
                embedding = generate_embedding(text)

                # Save embedding to the database
                product.embedding = embedding.tobytes()
                db.add(product)

                # Add embedding to FAISS index
                logger.debug(f"Adding product ID ({product.id}) to FAISS index.")
                index.add_with_ids(np.array([embedding], dtype=np.float32), np.array([product.id], dtype=np.int64))

            db.commit()
            logger.info(f"Processed batch {i // batch_size + 1}")

        # Save FAISS index to disk
        faiss.write_index(index, index_path)
        logger.info(f"FAISS index synchronized and saved to {index_path}")
    except Exception as e:
        logger.error(f"Error populating FAISS index: {e}")
        db.rollback()
        raise

def extract_conditions(query: str) -> dict:
    """
    Extract conditions like price range or product type from the query using regex.
    Enhanced: 支援 800元以上 / 至少800元 / 不低於800元 / 800~1200元 / 800-1200元 / 800到1200元 / 超過800元 / 大於800元 / 800元以下 / 800元至1200元
    Returns a dictionary with extracted conditions.
    """
    conditions = {}
    q = query.replace('　', ' ').strip()

    # Range patterns (various connectors)
    between_patterns = [
        r"(\d+)元?[~\-到至](\d+)元?",  # 800~1200元 / 800-1200元 / 800到1200元 / 800至1200元
        r"(\d+)元至(\d+)元",
    ]
    for pat in between_patterns:
        m = re.search(pat, q)
        if m:
            a, b = float(m.group(1)), float(m.group(2))
            if a <= b:
                conditions["min_price"], conditions["max_price"] = a, b
            else:
                conditions["min_price"], conditions["max_price"] = b, a
            break

    # Min only patterns
    min_patterns = [
        r"大於(\d+)元", r"超過(\d+)元", r"(\d+)元以上", r"(\d+)(?:元)?以上(?:的)?", r"至少(\d+)元", r"不低於(\d+)元", r"不小於(\d+)元"
    ]
    for pat in min_patterns:
        m = re.search(pat, q)
        if m and "min_price" not in conditions:
            conditions["min_price"] = float(m.group(1))
            break

    # Max only patterns
    max_patterns = [
        r"(\d+)元以下", r"不高於(\d+)元", r"低於(\d+)元", r"小於(\d+)元"
    ]
    for pat in max_patterns:
        m = re.search(pat, q)
        if m and "max_price" not in conditions:
            conditions["max_price"] = float(m.group(1))
            break

    # Simple product type examples (extendable)
    product_type_match = re.search(r"(耳機|手機|電腦|電視|相機|筆電)", q)
    if product_type_match:
        conditions["product_type"] = product_type_match.group(1)

    return conditions

# Search FAISS index
def search_faiss(db: Session, query: str, top_k: int = 100, email: str = '', similarity_threshold: float = 0.6, use_openai: bool = False):
    try:
        # Step 1: Extract conditions
        if use_openai:
            conditions = extract_conditions_with_langchain(query)
            # Fallback / merge with regex extraction if LLM missed numeric constraints
            regex_cond = extract_conditions(query)
            for k, v in regex_cond.items():
                if k not in conditions or conditions[k] is None:
                    conditions[k] = v
        else:
            conditions = extract_conditions(query)
        logger.debug(f"Extracted conditions: {conditions}")

        # Step 2: Generate query embedding
        embedding = generate_embedding(query)
        logger.debug(f"Generated embedding for query: {query}")

        # Step 3: Perform FAISS search
        distances, indices = index.search(np.array([embedding], dtype=np.float32), top_k)
        logger.debug(f"Search completed. Distances: {distances}, Indices: {indices}")

        # Step 4: Filter results based on similarity threshold and conditions
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx == -1:  # No match found
                continue
            logger.debug(f"Processing distance: {distance}, index: {idx}")
            if distance > similarity_threshold:
                continue

            product = get_approved_product_by_id(db, int(idx))
            if product:
                logger.debug(f"Found product: {product.id} - {product.product_name}, Price: {product.price}")
                # Apply condition filters
                if conditions.get("min_price") is not None and product.price < conditions["min_price"]:
                    continue
                if conditions.get("max_price") is not None and product.price > conditions["max_price"]:
                    continue

                # Add product to results
                like_count = db.query(Like).filter(Like.product_id == product.id).count()
                liked = db.query(Like).filter(Like.product_id == product.id, Like.email == email).first() is not None
                comment_count = db.query(Comment).filter(Comment.product_id == product.id).count()
                results.append(ProductViewModel(
                    id=product.id,
                    seller_name=product.seller_name,
                    seller_nickname=product.seller_nickname,
                    product_name=product.product_name,
                    price=product.price,
                    condition=product.condition,
                    description=product.description,
                    image_url=product.image_url,
                    ai_rating=product.ai_rating,
                    ai_comment=product.ai_comment,
                    ai_fit_owner=product.ai_fit_owner,
                    product_status=product.product_status,
                    buyer_name=product.buyer_name,
                    created_at=product.created_at.isoformat(),
                    is_approve=product.is_approve,
                    donation_ratio=product.donation_ratio,
                    seller_income=product.seller_income,
                    donation_amount=product.donation_amount,
                    like_count=like_count,
                    liked=liked,
                    comment_count=comment_count
                ))

        logger.debug(f"Search results: {len(results)} products found.\n{results}")
        return results
    except Exception as e:
        logger.error(f"Error during FAISS search: {e}")
        raise

# Update FAISS index
def update_faiss_index(product_id: int, embedding: np.ndarray):
    """
    Update the FAISS index with new or modified embedding vectors,
    then write the updated index to disk for persistent storage.
    """
    try:
        if isinstance(index, faiss.IndexIDMap):
            # Remove old embedding if it exists
            index.remove_ids(np.array([product_id], dtype=np.int64))

        # Add the new embedding
        index.add_with_ids(np.array([embedding], dtype=np.float32), np.array([product_id], dtype=np.int64))

        # Save the updated index to disk
        faiss.write_index(index, index_path)
        logger.info(f"Updated FAISS index for product ID {product_id} and saved to {index_path}")
    except Exception as e:
        logger.error(f"Error updating FAISS index for product ID {product_id}: {e}")
        raise
