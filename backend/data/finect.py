import requests
import xml.etree.ElementTree as ET
import json
import re
from typing import List, Dict, Optional
import yfinance as yf
from curl_cffi import requests as requests_yf
import sys
import os
from bs4 import BeautifulSoup

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
from database import FundDatabase
from time import sleep

def extract_isin_from_url(url: str) -> Optional[str]:
    """
    Extract ISIN from a Finect fund URL.

    URL format: https://www.finect.com/fondos-inversion/IE00BJBY7804-Montlake_ironshield_credit_usd_ret_pld

    Args:
        url (str): The fund URL

    Returns:
        Optional[str]: The ISIN if found, None otherwise
    """
    # Pattern to match ISIN (starts with IE or other country codes, followed by 10 alphanumeric characters)
    pattern = r'/([A-Z]{2}[A-Z0-9]{10})-[^/]*$'
    match = re.search(pattern, url)

    if match:
        return match.group(1)
    return None

def scrape_finect_sitemap() -> List[Dict[str, str]]:
    """
    Scrape the Finect funds sitemap and extract ISIN and URL data.

    Returns:
        List[Dict[str, str]]: List of dictionaries containing 'isin' and 'url' for each fund
    """
    sitemap_url = "https://www.finect.com/v4/bff/sitemap/funds.xml"

    try:
        print(f"Fetching sitemap from: {sitemap_url}")

        # Fetch the sitemap
        response = requests.get(sitemap_url, timeout=30)
        response.raise_for_status()

        print("Sitemap fetched successfully. Parsing XML...")

        # Parse XML
        root = ET.fromstring(response.content)

        # Namespace handling (some XML sitemaps use namespaces)
        ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

        # Find all url elements (try both with and without namespace)
        urls = root.findall('.//url') or root.findall('.//ns:url', ns)

        if not urls:
            print("No URL elements found in sitemap")
            return []

        funds_data = []
        processed_count = 0
        isin_count = 0

        print(f"Found {len(urls)} URLs to process...")

        for url_element in urls:
            processed_count += 1

            # Get URL location
            loc_element = url_element.find('loc') or url_element.find('ns:loc', ns)
            if loc_element is None or loc_element.text is None:
                continue

            url = loc_element.text.strip()

            # Extract ISIN from URL
            isin = extract_isin_from_url(url)

            if isin:
                isin_count += 1
                funds_data.append({
                    'isin': isin,
                    'url': url
                })

                # Print progress every 100 items
                if processed_count % 100 == 0:
                    print(f"Processed {processed_count} URLs, extracted {isin_count} ISINs...")

            # Print first few examples
            if processed_count <= 5:
                print(f"Example {processed_count}: URL={url}, ISIN={isin}")

        print(f"\nProcessing complete!")
        print(f"Total URLs processed: {processed_count}")
        print(f"ISINs extracted: {isin_count}")
        print(f"Success rate: {(isin_count/processed_count)*100:.1f}%" if processed_count > 0 else "0%")

        return funds_data

    except requests.exceptions.RequestException as e:
        print(f"Error fetching sitemap: {e}")
        return []
    except ET.ParseError as e:
        print(f"Error parsing XML: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error: {e}")
        return []

def save_to_json(data: List[Dict[str, str]], filename: str = "finect.json") -> bool:
    """
    Save the funds data to a JSON file.

    Args:
        data (List[Dict[str, str]]): The funds data to save
        filename (str): The output filename

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"\nData saved successfully to {filename}")
        print(f"Total funds saved: {len(data)}")
        return True

    except Exception as e:
        print(f"Error saving to JSON: {e}")
        return False

def main():
    """
    Main function to scrape Finect sitemap and save data.
    """
    print("=" * 60)
    print("FINECT FUNDS ISIN SCRAPER")
    print("=" * 60)

    # Scrape the sitemap
    funds_data = scrape_finect_sitemap()

    if not funds_data:
        print("No data to save. Exiting.")
        return

    # Save to JSON
    success = save_to_json(funds_data, "finect.json")

    if success:
        print("\nSample of saved data:")
        for i, fund in enumerate(funds_data[:5]):
            print(f"  {i+1}. ISIN: {fund['isin']}, URL: {fund['url']}")

        if len(funds_data) > 5:
            print(f"  ... and {len(funds_data) - 5} more funds")

def read_file():
    with open("finect.json", "r") as f:
        data = json.load(f)
        db = FundDatabase()
        session = requests_yf.Session(impersonate="chrome")
        for json_data in data:
            # sleep(1)
            try:
                fund = db.get_fund_by_isin(json_data['isin'])
                if fund != None:
                    print("Fund already exists")
                    continue
                print("=" * 60)
                print(json_data['isin'])
                fund = yf.Ticker(json_data['isin'], session=session)
                db.insert_fund(json_data['isin'], fund.info)
                month_history = fund.history(period="max", interval="1d")
                for index, row in month_history.iterrows():
                    date = index.strftime('%Y-%m-%d')
                    db.insert_price_history(json_data['isin'], date, row["Close"])
            except Exception as e:
                print(e)
                continue
    return data

def get_finect_json():
    with open("finect.json", "r") as f:
        data = json.load(f)

    return data

def scrape_finect_data(url, isin):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    request = requests.get(url, headers=headers)
    soup = BeautifulSoup(request.text, 'html.parser')

    fund_info = {}

    tab_childs = soup.find_all(
        "div",
        class_=["TabChild-sc-e313xw-0 xkoFx", "TabChild-sc-e313xw-0 hDmiIy"]
    )

    for tab_child in tab_childs:
        if tab_child:
            inner_div = tab_child.find("div", class_="partials__Inner-sc-jtcrtv-0 dVBgww")
            if inner_div:
                fee_rows = inner_div.find_all("div", class_="partials__RowBlock-sc-jtcrtv-3")
                for row in fee_rows:
                    label_div = row.find("div", class_="partials__HeaderColumn-sc-jtcrtv-5")
                    value_div = row.find("div", class_="dWvuOc")
                    if label_div and value_div:
                        label = label_div.get_text(strip=True)
                        # Try to extract the value, which may be inside nested spans
                        value_span = value_div.find("span")
                        if value_span:
                            # If there is a nested <span> inside, get its text
                            inner_span = value_span.find("span")
                            if inner_span:
                                value = inner_span.get_text(strip=True)
                                # Check if there's a trailing % outside the inner span
                                percent = value_span.get_text(strip=True).replace(value, "").strip()
                                value = value + percent
                            else:
                                value = value_span.get_text(strip=True)
                        else:
                            value = value_div.get_text(strip=True)
                        fund_info[label] = value

    # Extract class information from the modal table if present
    modal_overlay = soup.find("div", class_="ModalOverlay-sc-ts9r57-0")
    classes = []
    if modal_overlay:
        modal_box = modal_overlay.find("div", class_="ModalBox-sc-1j0lgi0-0")
        if modal_box:
            modal_content = modal_box.find("div", class_="ModalContent-sc-5hi519-0")
            if modal_content:
                content_wrapper = modal_content.find("div", class_="ContentWrapper-sc-1w12gwl-0")
                if content_wrapper:
                    inner_spacing = content_wrapper.find("div", class_="partials__InnerSpacing-sc-m6n7ga-1")
                    if inner_spacing:
                        table_scrollable = inner_spacing.find("div", class_="partials__TableScrollable-sc-m6n7ga-3")
                        if table_scrollable:
                            inner = table_scrollable.find("div", class_="Inner-sc-4nwdos-0")
                            if inner:
                                table = inner.find("table")
                                if table:
                                    tbody = table.find("tbody")
                                    if tbody:
                                        for tr in tbody.find_all("tr"):
                                            tds = tr.find_all("td")
                                            th = tr.find("th")
                                            class_info = {}
                                            # Class name
                                            if th:
                                                a = th.find("a")
                                                if a:
                                                    class_info["class_name"] = a.get_text(strip=True)
                                                    # class_info["class_url"] = a.get("href")
                                            # ISIN
                                            if len(tds) > 0:
                                                isin_span = tds[0].find("span", class_="partials__ISINLabel-sc-m6n7ga-0")
                                                if isin_span:
                                                    class_info["isin"] = isin_span.get_text(strip=True)

                                            if class_info and class_info["isin"] != isin:
                                                classes.append(class_info)
    if classes:
        fund_info["clases"] = classes



    # Print all extracted info
    db_fields = {
        "Gestora": "manager",
        "Categoría": "category",
        "Benchmark": "benchmark",
        "Patrimonio del fondo": "fund_assets",
        "Patrimonio de la clase": "class_assets",
        "Fecha de inicio": "start_date",
        "Comisión de gestión": "management_fee",
        "Comisión de éxito": "performance_fee",
        "Comisión de custodia": "custody_fee",
        "Gastos corrientes": "ongoing_charges",
        "Comisión de reembolso": "redemption_fee",
        "Comisión de suscripción": "subscription_fee",
        "clases": "classes",
    }

    fee_fields = {
        "management_fee",
        "performance_fee",
        "custody_fee",
        "ongoing_charges",
        "redemption_fee",
        "subscription_fee",
    }

    result = {}

    for label, value in fund_info.items():
        if label in db_fields:
            key = db_fields[label]
            if key in fee_fields:
                # Remove % and convert to float if possible, else keep as is (e.g. "n/a")
                if isinstance(value, str):
                    value_clean = value.replace("%", "").replace(".", "").replace(",", ".").strip()
                    try:
                        # Only parse if it's a number, else keep as is (e.g. "n/a")
                        value_float = float(value_clean)
                        result[key] = value_float
                    except ValueError:
                        pass
                else:
                    result[key] = value
            else:
                result[key] = value

    for label, value in result.items():
        print(f"{label}: {value}")

    return result

def handle_finect_data():
    data = get_finect_json()
    db = FundDatabase()
    for json_data in data:
        url = json_data['url']
        isin = json_data['isin']
        try:
            result = scrape_finect_data(url, isin)
            result = db.insert_finect_data(isin, result)
            if result:
                print("Fund inserted successfully")
            else:
                print("Fund not inserted")
            print("=" * 60)
        except Exception as e:
            print(e)
            continue

if __name__ == "__main__":
    handle_finect_data()