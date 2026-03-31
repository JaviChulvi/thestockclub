import yfinance as yf
import numpy as np

def get_stock_price_history(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        history = stock.history(period="6mo", interval="1d")
        if history is not None and not history.empty:
            history = history.reset_index()
            history['date'] = history['Date'].dt.strftime('%Y-%m-%d')
            history['close_price'] = history['Close']
            history.set_index('date', inplace=True)
            history = history.sort_index()
            return history
        else:
            return None
    except Exception as e:
        print(f"Error getting stock price history for {ticker}: {str(e)}")
        return None

def get_stock_recommendations(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        recommendations = stock.recommendations
        return recommendations.to_dict()
    except Exception as e:
        print(f"Error getting stock recommendations for {ticker}: {str(e)}")
        return None

def format_stock_recommendations(recommendations_data: dict) -> list:
    """
    Convert raw yfinance recommendations data into a frontend-friendly format.

    Args:
        recommendations_data: Raw dict from yfinance recommendations.to_dict()

    Returns:
        List of dicts with human-readable period labels and recommendation counts.
        Each dict contains:
        - period: Human-readable time period (e.g., "Current", "1 Month Ago")
        - period_code: Original yfinance period code (e.g., "0m", "-1m")
        - strongBuy, buy, hold, sell, strongSell: Count of each recommendation type
        - total: Total number of recommendations for this period
        - positive: Sum of buy + strongBuy recommendations
        - negative: Sum of sell + strongSell recommendations
        - net_score: Normalized score from -100 to 100 (100 = all strong buy, -100 = all strong sell)
    """
    if not recommendations_data or not isinstance(recommendations_data, dict):
        return []

    # Map period codes to human-readable labels
    period_labels = {
        '0m': 'Current',
        '-1m': '1 Month Ago',
        '-2m': '2 Months Ago',
        '-3m': '3 Months Ago'
    }

    formatted_data = []

    # Get all period keys (assuming they follow the pattern 0, 1, 2, 3)
    period_keys = sorted([k for k in recommendations_data.get('period', {}).keys()])

    for period_key in period_keys:
        period_code = recommendations_data['period'].get(period_key, '')
        period_label = period_labels.get(period_code, period_code)

        recommendation = {
            'period': period_label,
            'period_code': period_code,
            'strongBuy': recommendations_data.get('strongBuy', {}).get(period_key, 0),
            'buy': recommendations_data.get('buy', {}).get(period_key, 0),
            'hold': recommendations_data.get('hold', {}).get(period_key, 0),
            'sell': recommendations_data.get('sell', {}).get(period_key, 0),
            'strongSell': recommendations_data.get('strongSell', {}).get(period_key, 0)
        }

        # Use NumPy for vectorized calculations
        rec_values = np.array([
            recommendation['strongBuy'],
            recommendation['buy'],
            recommendation['hold'],
            recommendation['sell'],
            recommendation['strongSell']
        ], dtype=np.int32)

        # Calculate total recommendations for this period
        recommendation['total'] = int(np.sum(rec_values))

        # Calculate positive recommendations (Buy + Strong Buy)
        recommendation['positive'] = int(rec_values[0] + rec_values[1])

        # Calculate negative recommendations (Sell + Strong Sell)
        recommendation['negative'] = int(rec_values[3] + rec_values[4])

        # Calculate net score (-100 to 100, where 100 = all strong buy, -100 = all strong sell)
        if recommendation['total'] > 0:
            # Vectorized weighted calculation
            weights = np.array([1.0, 0.5, 0.0, -0.5, -1.0])
            recommendation['net_score'] = float(np.dot(rec_values, weights) / recommendation['total'] * 100)
        else:
            recommendation['net_score'] = 0

        formatted_data.append(recommendation)

    return formatted_data

def aggregate_fund_recommendations(stock_recommendations_list: list) -> list:
    """
    Aggregate recommendations from multiple stocks (for fund-level analysis).

    Args:
        stock_recommendations_list: List of formatted recommendation data from multiple stocks

    Returns:
        List of dicts with complete recommendation statistics for each time period.
        Each dict contains:
        - period: Time period label (e.g., "Current", "1 Month Ago")
        - strongBuy, buy, hold, sell, strongSell: Total counts for each recommendation type
        - total: Total number of recommendations across all stocks for this period
        - positive: Sum of buy + strongBuy recommendations
        - negative: Sum of sell + strongSell recommendations
        - net_score: Normalized score from -100 to 100 (100 = all strong buy, -100 = all strong sell)
    """
    if not stock_recommendations_list:
        return []

    # Group by period using NumPy arrays for efficient aggregation
    aggregated = {}
    rec_types = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell']

    for stock_data in stock_recommendations_list:
        for recommendation in stock_data:
            period = recommendation['period']

            if period not in aggregated:
                # Initialize with NumPy array for efficient operations
                aggregated[period] = {
                    'period': period,
                    'values': np.zeros(5, dtype=np.int32)  # [strongBuy, buy, hold, sell, strongSell]
                }

            # Vectorized addition using NumPy
            rec_array = np.array([
                recommendation.get('strongBuy', 0),
                recommendation.get('buy', 0),
                recommendation.get('hold', 0),
                recommendation.get('sell', 0),
                recommendation.get('strongSell', 0)
            ], dtype=np.int32)

            aggregated[period]['values'] += rec_array

    # Calculate totals and derived metrics from aggregated data using NumPy
    weights = np.array([1.0, 0.5, 0.0, -0.5, -1.0])

    for period_key, period_data in aggregated.items():
        values = period_data['values']

        # Calculate total
        total = int(np.sum(values))

        # Build result dict
        result_dict = {
            'period': period_data['period'],
            'strongBuy': int(values[0]),
            'buy': int(values[1]),
            'hold': int(values[2]),
            'sell': int(values[3]),
            'strongSell': int(values[4]),
            'total': total,
            'positive': int(values[0] + values[1]),
            'negative': int(values[3] + values[4])
        }

        # Calculate net score using vectorized dot product
        if total > 0:
            result_dict['net_score'] = float(np.dot(values, weights) / total * 100)
        else:
            result_dict['net_score'] = 0

        # Replace the values array with the final dict
        aggregated[period_key] = result_dict

    # Convert to list format for frontend and sort by period
    result = list(aggregated.values())
    period_order = ['Current', '1 Month Ago', '2 Months Ago', '3 Months Ago']
    result.sort(key=lambda x: period_order.index(x['period']) if x['period'] in period_order else 999)

    return result

def get_fund_recommendations_summary(stock_recommendations_list: list) -> str:
    """
    Generate a human-readable summary of aggregated fund recommendations.

    Args:
        stock_recommendations_list: List of formatted recommendation data from multiple stocks

    Returns:
        Formatted string with recommendation summary
    """
    if not stock_recommendations_list:
        return "No recommendations data available."

    aggregated = aggregate_fund_recommendations(stock_recommendations_list)
    if not aggregated:
        return "No recommendations data available."

    summary_lines = ["**Analyst Recommendations Summary:**"]

    for rec in aggregated:
        positive_pct = (rec['positive'] / rec['total'] * 100) if rec['total'] > 0 else 0
        negative_pct = (rec['negative'] / rec['total'] * 100) if rec['total'] > 0 else 0

        summary_lines.append(f"\n**{rec['period']}:**")
        summary_lines.append(f"- Strong Buy: {rec['strongBuy']} ({rec['strongBuy']/rec['total']*100:.1f}%)" if rec['total'] > 0 else f"- Strong Buy: {rec['strongBuy']} (0%)")
        summary_lines.append(f"- Buy: {rec['buy']} ({rec['buy']/rec['total']*100:.1f}%)" if rec['total'] > 0 else f"- Buy: {rec['buy']} (0%)")
        summary_lines.append(f"- Hold: {rec['hold']} ({rec['hold']/rec['total']*100:.1f}%)" if rec['total'] > 0 else f"- Hold: {rec['hold']} (0%)")
        summary_lines.append(f"- Sell: {rec['sell']} ({rec['sell']/rec['total']*100:.1f}%)" if rec['total'] > 0 else f"- Sell: {rec['sell']} (0%)")
        summary_lines.append(f"- Strong Sell: {rec['strongSell']} ({rec['strongSell']/rec['total']*100:.1f}%)" if rec['total'] > 0 else f"- Strong Sell: {rec['strongSell']} (0%)")
        summary_lines.append(f"- **Positive (Buy+Strong Buy):** {positive_pct:.1f}%")
        summary_lines.append(f"- **Negative (Sell+Strong Sell):** {negative_pct:.1f}%")
        summary_lines.append(f"- **Net Score:** {rec['net_score']:.1f}/100")

    return "\n".join(summary_lines)

if __name__ == "__main__":
    # Example usage
    raw_recommendations = get_stock_recommendations("AAPL")
    if raw_recommendations:
        print("Raw recommendations data:")
        print(raw_recommendations)
        print("\nFormatted recommendations data:")
        formatted = format_stock_recommendations(raw_recommendations)
        print(formatted)

        # Example of aggregating multiple stocks (for fund analysis)
        print("\nExample fund aggregation with multiple stocks:")
        # Simulate recommendations for multiple stocks
        tickers = ["AAPL", "MSFT", "GOOGL"]
        stock_data = []

        for ticker in tickers:
            rec_data = get_stock_recommendations(ticker)
            if rec_data:
                formatted_data = format_stock_recommendations(rec_data)
                if formatted_data:
                    stock_data.append(formatted_data)

        if stock_data:
            fund_recommendations = aggregate_fund_recommendations(stock_data)
            print("Fund-level recommendations (all stocks combined):")
            for rec in fund_recommendations:
                print(rec)
                print(f"  {rec['period']}:")
                print(f"    Strong Buy: {rec['strongBuy']}, Buy: {rec['buy']}, Hold: {rec['hold']}, Sell: {rec['sell']}, Strong Sell: {rec['strongSell']}")
                print(f"    Total: {rec['total']}, Positive: {rec['positive']}, Negative: {rec['negative']}, Net Score: {rec['net_score']:.1f}")
        else:
            print("  No recommendations data available for the selected stocks")