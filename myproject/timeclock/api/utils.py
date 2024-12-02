from decimal import Decimal

def format_hours(hours):
    """Convert decimal hours to XXH XXM format"""
    if hours is None:
        return "0H 0M"
    
    # Convert to decimal for precise calculation
    hours_decimal = Decimal(str(hours))
    
    # Calculate hours and minutes
    hours_part = int(hours_decimal)
    minutes_part = int((hours_decimal % 1) * 60)
    
    return f"{hours_part}H {minutes_part}M"
