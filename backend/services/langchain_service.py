import json
from utils.logger import Logger

logger = Logger.get_logger(logger_name="LangChain Service")

def generate_response(context: str, user_query: str, total_products: int = 0) -> str:
    # Demo 模式：未設定真實 OpenAI key 時回傳示範訊息，不呼叫 LLM
    from services.ai_demo import ai_enabled, demo_chat_response
    if not ai_enabled():
        return demo_chat_response()

    # 延遲載入 langchain（demo 模式不載入，省記憶體）
    from langchain.prompts import PromptTemplate
    from langchain_openai import ChatOpenAI
    from langchain_core.rate_limiters import InMemoryRateLimiter
    rate_limiter = InMemoryRateLimiter(requests_per_second=7000)

    # Define the LangChain prompt template
    prompt_template = PromptTemplate(
        input_variables=["context", "query", "total_products"],
        template="""
        你是一位負責"BidForGood 公益市集活動"的AI小助手。你的名字叫做"AI小助理"，你要根據以下商品資訊，回答使用者的問題。
        請用親切活潑並帶有幽默感的語氣回答也可以帶上 emoji，盡可能提供詳細的解釋。可以用有趣的形容說明你怎麼找的到這些商品的。
        **重要：請統一使用繁體中文回答，避免使用簡體字。**
        回答結果的開頭，請用"{{id_1, id_2, id_3, ...}}|"來作為回答的開頭。其中id_i是符合項目在商品資訊中的id，初始為1。
        在找不到商品的時候，請用"{{ }}|"來作為回答的開頭
        
        **系統狀態：目前市集總共有 {total_products} 件商品**
        
        搜尋時，請注意下列事項：
        1. 請依據Product.id來分辨不同資料，即使其他欄位內容相同，也不要將結果視為同一筆資料。
        2. 如果有多筆資料符合條件，請將最相關的結果放在最前面。
        3. 查詢時，請忽略Product.price條件，{context}中已經針對該條件進行一次filter。
        4. 如果查詢條件包含product_type，請根據Product.product_name, Product.ai_comment以及Product.description進行嚴格的filter。
        5. 特別注意：如果使用者查詢包含"ID"或"id"後面跟著數字（如"ID57", "id57", "商品57"），請將該數字視為商品的Id進行精確匹配。
        6. **重要判斷規則**：
           - 如果 total_products = 0，表示市集目前沒有任何商品，請直接告知使用者「目前市集還沒有商品唷！請稍後再來看看～」
           - 如果 total_products > 0 但找不到符合條件的商品，可以建議使用者看看其他商品或調整搜尋條件
        7. 如果結果找到超過5筆符合項目，回答開頭須包含所有id，但後方內容千萬不要用條列式介紹商品，強調重點即可。

        補充資訊：
        Condition => 新舊程度 (1~4)  [1=全新, 2=九成新, 3=五成新, 4=低於五成新]
        AI Rating => AI 鑑定等級 (1~5) [1=普通, 2=精良, 3=史詩, 4=傳說, 5=神話]
        AI Comment => AI 鑑定報告
        Seller Nickname => 商品賣家的暱稱

        商品資訊：
        {context}

        使用者問題：
        {query}

        回答：
        """
    )

    # Format the prompt
    prompt = prompt_template.format(context=context, query=user_query, total_products=total_products)
    logger.debug(f"Generated prompt: {prompt}")

    # Use ChatOpenAI to generate a response
    llm = ChatOpenAI(model="gpt-4o", temperature=1, rate_limiter=rate_limiter)  # ChatOpenAI is designed for chat models
    response = llm.invoke(prompt)  # Use `invoke` for generating responses
    return response.content

def extract_conditions_with_langchain(user_query: str) -> dict:
    """
    Use LangChain to extract conditions like price range or product type from the query.
    Returns a dictionary with extracted conditions.
    """
    from services.ai_demo import ai_enabled
    if not ai_enabled():
        return {}
    from langchain.prompts import PromptTemplate
    from langchain_openai import ChatOpenAI
    from langchain_core.rate_limiters import InMemoryRateLimiter
    rate_limiter = InMemoryRateLimiter(requests_per_second=7000)
    try:
        # Define the LangChain prompt template for condition extraction
        prompt_template = PromptTemplate(
            input_variables=["query"],
            template="""
            以下是使用者的搜尋問題，請幫我提取其中的條件並務必以JSON格式返回。
            條件可能包括：
            - min_price: 最低價格
            - max_price: 最高價格

            請直接回傳純 JSON 格式（不要加解釋、不要換行），例如：
            {{"min_price": 100, "max_price": 500}}

            若無法判斷任何條件，請回傳：
            {{"min_price": null, "max_price": null}}

            使用者問題：
            {query}

            """
        )

        # Format the prompt
        prompt = prompt_template.format(query=user_query)

        # Use ChatOpenAI to generate a response
        llm = ChatOpenAI(model="gpt-4o", temperature=1, rate_limiter=rate_limiter)
        response = llm.invoke(prompt)
        text = response.content.strip()
        print(f"Response from LangChain: {text}")

        # Parse the JSON response
        conditions = json.loads(text)
        logger.debug(f"Extracted conditions: {conditions}")
        return conditions
    except Exception as e:
        logger.error(f"Error extracting conditions with LangChain: {e}")
        return {}
