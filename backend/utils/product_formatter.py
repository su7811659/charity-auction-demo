class ProductFormatter:
    """
    A class to handle formatting of product fields into different string formats.
    """

    TEMPLATES = {
        "embedding": "{id} {product_name} {description} {condition} {ai_rating} {ai_comment} {seller_nickname} {price} {like_count}",
        "langchain_context": """
            Id: {id}, Product: {product_name}, Description: {description}, Condition: {condition},
            AI Rating: {ai_rating}, AI Comment: {ai_comment},
            Seller Nickname: {seller_nickname}, Price: {price},
            Like Count: {like_count}
        """
    }

    @staticmethod
    def format(product, template_name: str) -> str:
        """
        Format product details based on the given template name.
        :param product: Product object containing product details.
        :param template_name: Name of the template to use.
        :return: Formatted string.
        """
        template = ProductFormatter.TEMPLATES.get(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found.")
        
        # Extract all fields from the template dynamically
        fields = {field: getattr(product, field, None) or '' for field in ProductFormatter._extract_fields(template)}
        
        return template.format_map(fields)

    @staticmethod
    def _extract_fields(template: str) -> list:
        """
        Extract all field names from the template string.
        :param template: Template string with placeholders.
        :return: List of field names.
        """
        import string
        return [field_name for _, field_name, _, _ in string.Formatter().parse(template) if field_name]
