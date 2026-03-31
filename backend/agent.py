from typing import Optional, List
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
import os
import json
import re
from dotenv import load_dotenv
from database import FundDatabase
import fund_analysis
import stock_analysis
from vector import category_retriever_service

# Load environment variables at module level
load_dotenv()

class ToolOutputWithArtifact:
    """A custom class to hold tool output."""
    def __init__(self, llm_message: str, artifact: str, isin: str):
        self.llm_message = llm_message
        self.artifact = artifact
        self.isin = isin

    def __str__(self):
        """
        String representation for the LLM.
        This is what the model will see as the tool's output.
        """
        return self.llm_message

class AiAgent:
    DEFAULT_FALLBACK = "Nuestro agente ha tenido problemas para procesar tu consulta. Por favor, intenta reformularla."

    def default_serializer(obj):
        if hasattr(obj, '__float__'):  # Decimal objects
            return float(obj)
        elif hasattr(obj, 'isoformat'):  # datetime objects
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    def __init__(self):
        print("Initializing AiAgent...")
        db = FundDatabase()
        print("✓ Database connection established")
        
        @tool
        def return_best_ytd_fund(query: str, top_k: int = 3) -> str:
            """Devuelve los fondos de inversión con el mejor rendimiento YTD (rendimiento para el año)."""
            funds = db.get_best_ytd_funds(top_k)
            return f"En base a tu query '{query}', aqui estan los {top_k} fondos de inversión con mejor rendimiento YTD: {funds}, formatea la respuesta como una lista de tuplas con el formato: isin: long_name - ytd_return cada una en una nueva linea"

        @tool
        def return_best_last_90d_fund(query: str, top_k: int = 3) -> str:
            """Devuelve los fondos de inversión con el mejor rendimiento en los últimos 90 días (rendimiento reciente)."""
            funds = db.get_best_last_90d_funds(top_k)
            return f"En base a tu query '{query}', aqui estan los {top_k} fondos de inversión con mejor rendimiento en los últimos 90 días: {funds}, formatea la respuesta como una lista de tuplas con el formato: isin: long_name - last_90d_return cada una en una nueva linea"

        @tool
        def return_fund_info(isin: str) -> ToolOutputWithArtifact:
            """Obtiene información detallada sobre un fondo de inversión usando su ISIN. 
            Use este tool cuando los usuarios pregunten sobre:
            - Un fondo de inversión específico (ej. "dime sobre el fondo IE0032126645")
            - Detalles, información o análisis de un fondo de inversión
            - Datos de rendimiento para un ISIN específico
            - Cualquier cosa relacionada con un identificador de fondo específico
            
            Ejemplos de uso:
            - "dime sobre el fondo IE0032126645"
            - "información del fondo IE0032126645"
            - "análisis del fondo IE0032126645"
            - "datos de rendimiento del fondo IE0032126645"
            - "información sobre el fondo IE0032126645"
            Args:
                isin: El ISIN del fondo (ej. IE0032126645)
            """
            fund = db.get_fund_by_isin(isin)

            fund_json = json.dumps(fund, default=AiAgent.default_serializer)

            if fund is None:
                return ToolOutputWithArtifact("No se encontraron inversiones para el fondo {isin} en nuestro sistema.", None, isin)
            
            return ToolOutputWithArtifact(f"Aqui tienes las informacion del fondo {isin}: {fund_json}. Informa al usuario sobre el fondo y sus caracteristicas principales. Explica la cateforia del fondo y sus holdings principales.", "fund_info", isin)

        @tool
        def return_stock_info(ticker: str) -> ToolOutputWithArtifact:
            """Obtiene información detallada sobre una acción/stock usando su ticker o símbolo bursátil.
            Use este tool cuando los usuarios pregunten sobre:
            - Una acción o empresa específica (ej. "info de AAPL", "dame info de JPM", "cuéntame sobre Microsoft")
            - Símbolos bursátiles de 1-5 caracteres (ej. MSFT, GOOGL, BRK.B, NVDA)
            - Empresas conocidas por su ticker (Apple, Microsoft, JPMorgan, etc.)

            Ejemplos de uso:
            - "dame info de JPM" (ticker de JPMorgan Chase)
            - "información de AAPL" (ticker de Apple)
            - "cuéntame sobre Tesla" (usar ticker TSLA)
            - "datos de $MSFT" (ticker de Microsoft)

            NO usar para:
            - ISINs de fondos (usan return_fund_info)
            - Búsquedas de qué fondos tienen una acción (usar return_funds_holding_stock)

            Args:
                ticker: El símbolo bursátil de la acción (ej. JPM, AAPL, 2330.TW, GARAN.IS)
            """
            stock = db.get_stock_by_symbol(ticker)

            if stock is None:
                return ToolOutputWithArtifact("No se encontraron inversiones para la accion {ticker} en nuestro sistema.", None, ticker)

            stock_json = json.dumps(stock, default=AiAgent.default_serializer)
            return ToolOutputWithArtifact(f"Aqui tienes la informacion de la accion {ticker}: {stock_json}. El componente visual ya muestra las métricas financieras (precio, P/E, market cap, ratios, etc.). Tu enfoque debe ser CUALITATIVO: explica el negocio de la empresa, su sector ({stock.get('sector_key')}), industria ({stock.get('industry_key')}), estrategia, ventajas competitivas, y contexto del mercado. NO repitas las métricas numéricas que ya se muestran visualmente.", "stock_info", ticker)

        @tool
        def search_stocks_by_sector_country(sector: str = None, country: str = None, top_k: int = 10) -> ToolOutputWithArtifact:
            """Busca acciones por sector y/o país, mostrando los mejores resultados por capitalización de mercado.

            Use este tool cuando los usuarios pregunten sobre:
            - Acciones de un sector específico (ej. "acciones tecnológicas", "empresas de energía")
            - Acciones de un país específico (ej. "acciones de Estados Unidos", "empresas japonesas")
            - Combinación de sector y país (ej. "tecnológicas de EEUU", "energía en Canadá")

            SECTORES DISPONIBLES (debe mapear términos del usuario a estos valores exactos):
            - technology (tecnología, tech)
            - healthcare (salud, farmacéuticas)
            - financial-services (finanzas, bancos, servicios financieros)
            - energy (energía, petróleo, oil & gas)
            - consumer-cyclical (consumo cíclico, retail discrecional)
            - consumer-defensive (consumo defensivo, productos básicos)
            - industrials (industrial, manufactura)
            - communication-services (comunicaciones, telecomunicaciones, telecom)
            - basic-materials (materiales básicos, minería)
            - real-estate (inmobiliario, bienes raíces)
            - utilities (utilities, servicios públicos)

            PAÍSES DISPONIBLES (ejemplos principales, hay 57 en total):
            - United States, China, Japan, United Kingdom, Germany, France
            - Canada, Australia, India, South Korea, Taiwan, Brazil
            - Spain, Italy, Netherlands, Switzerland, Sweden, Norway

            MAPEO DE TÉRMINOS COMUNES:
            - "EEUU", "USA", "Estados Unidos", "americanas" → "United States"
            - "UK", "Reino Unido", "Inglaterra" → "United Kingdom"
            - "tecnología", "tech" → "technology"
            - "salud", "healthcare", "farmacéuticas" → "healthcare"
            - "energía", "petróleo" → "energy"

            Ejemplos de uso:
            - "acciones tecnológicas de Estados Unidos" → sector="technology", country="United States"
            - "empresas de energía en Canadá" → sector="energy", country="Canada"
            - "acciones de salud" → sector="healthcare", country=None
            - "empresas japonesas" → sector=None, country="Japan"

            Args:
                sector: El sector de las acciones (usar nombres en inglés de la lista)
                country: El país de las acciones
                top_k: Número máximo de resultados a devolver (default: 10)
            """
            try:
                # Call the database method with filters
                stocks = db.get_filtered_stocks(
                    country=country,
                    sector=sector,
                    limit=top_k
                )

                if not stocks or len(stocks) == 0:
                    sector_msg = f" del sector {sector}" if sector else ""
                    country_msg = f" de {country}" if country else ""
                    return ToolOutputWithArtifact(
                        f"No se encontraron acciones{sector_msg}{country_msg} en nuestro sistema.",
                        None,
                        ""
                    )

                # Build descriptive message with macro analysis
                sector_desc = f"del sector **{sector}**" if sector else ""
                country_desc = f"en **{country}**" if country else ""
                location_text = f"{sector_desc} {country_desc}".strip()

                llm_message = f"""He encontrado las {len(stocks)} principales empresas {location_text} por capitalización de mercado.

A continuación se muestra una tabla interactiva con estas empresas. Por favor, proporciona un análisis macro sobre el sector {sector if sector else 'seleccionado'} {country_desc}, explicando:

1. **Características clave del sector** y su estado actual en el mercado
2. **Contexto económico** del país/región (si aplica)
3. **Tendencias y perspectivas** de crecimiento del sector
4. **Factores de riesgo** relevantes para inversores

**IMPORTANTE:** NO listes las empresas individualmente - el usuario puede verlas en la tabla interactiva que se muestra abajo."""

                # Return with artifact to render the table in frontend
                # We'll use a JSON string as the identifier to pass filter params
                artifact_id = json.dumps({"sector": sector, "country": country, "count": len(stocks)})

                return ToolOutputWithArtifact(llm_message, "stock_search_results", artifact_id)

            except Exception as e:
                print(f"Error in search_stocks_by_sector_country: {e}")
                return ToolOutputWithArtifact(
                    f"Hubo un error al buscar acciones. Por favor, intenta reformular tu consulta.",
                    None,
                    ""
                )

        @tool
        def return_top_holdings(isin: str) -> ToolOutputWithArtifact:
            """Obtiene las principales inversiones de un fondo de inversión usando su ISIN. Use este tool cuando los usuarios pregunten sobre las principales inversiones de un fondo o sobre dónde invierte el fondo."""
            fund_holdings = db.get_fund_holdings(isin)
            print(f"Fund holdings: {fund_holdings}")
            if fund_holdings:
                return ToolOutputWithArtifact(f"Las principales inversiones del fondo {isin} son: {fund_holdings}, formatea la respuesta como una LISTA de tuplas con el formato: isin: long_name (ticker) - weight cada una en una nueva linea con un punto al inicio de la linea", "top_holdings", isin)
            return ToolOutputWithArtifact("No se encontraron inversiones para el fondo {isin} en nuestro sistema.", None, isin)

        @tool
        def return_funds_holding_stock(ticker: str) -> str:
            """Obtiene los fondos de inversión que tienen una acción específica. Use este tool cuando los usuarios pregunten sobre qué fondos tienen una acción específica. El ticker es el símbolo de la acción sin el signo $."""
            funds = db.get_funds_holding_stock(ticker, 5)
            return f"Los fondos que tienen la acción {ticker} son: {funds}, formatea la respuesta como una LISTA con el formato: isin: long_name - weight. Utiliza el formato de markdown para formatear la respuesta, y usa el formato de lista ordenada con números dejando espacio entre el número y el texto."

        @tool
        def calculate_fund_volatility(isin: str) -> str:
            """Calcula la volatilidad y los métricas de riesgo para un fondo de inversión. Use este tool cuando los usuarios pregunten sobre el riesgo o la volatilidad de un fondo de inversión."""
            volatility = fund_analysis.get_fund_volatility(isin)
            return f"La volatilidad del fondo {isin} es: {volatility}"

        @tool
        def return_fund_comparison(isin_list: List[str]) -> str:
            """Obtiene una comparación entre un listado de fondos de inversión usando sus ISINs. Use este tool cuando los usuarios pregunten sobre una comparación entre fondos de inversión."""
            fund_values = db.get_funds_info_from_isin_list(isin_list)
            if fund_values:
                return f"La comparación entre los fondos {isin_list} es: {fund_values}. Incluye un texto descriptivo de la comparación, enfocandote en las diferencias entre los fondos."
            return f"No se encontraron valores para los fondos {isin_list} en nuestro sistema."

        @tool
        def return_funds_fees(isin_list: List[str]) -> str:
            """Obtiene las comisiones de un listado de fondos de inversión usando sus ISINs. Use este tool cuando los usuarios pregunten sobre las comisiones de un fondo de inversión."""
            fund_values = db.get_funds_fees_from_isin_list(isin_list)
            if fund_values:
                return f"Las comisiones de los fondos {isin_list} son: {fund_values}. Incluye un texto descriptivo de las comisiones, enfocandote en las diferencias entre los fondos."
            return f"No se encontraron valores de comisiones para los fondos {isin_list} en nuestro sistema."

        @tool  
        def analyze_drawdowns(isin: str, time_period: str = "3Y") -> str:
            """Analiza el máximo drawdown, los periodos de recuperación y el riesgo de bajada para un fondo de inversión.
            Args:
                isin: El ISIN del fondo (ej. IE0032126645)
                time_period: El periodo de tiempo a analizar (ej. "3Y" para 3 años, "1Y" para 1 año, siempre en años)
            """
            drawdowns = fund_analysis.analyze_drawdowns(isin, time_period)
            return f"El análisis de drawdowns del fondo {isin} en el periodo {time_period} es: Máximo drawdown: {drawdowns['max_drawdown']:.2f}%, Duración del drawdown: {drawdowns['drawdown_duration_days']} días, Tiempo de recuperación: {drawdowns['recovery_time_days']} días, Fecha del valle: {drawdowns['trough_date']}, Fecha del pico: {drawdowns['peak_date']}"

        @tool
        def search_funds_by_category(query: str) -> str:
            """Busca fondos de inversión basándose en descripciones de categorías como tipo de activo, región o estrategia.
            Use este tool cuando los usuarios pregunten sobre invertir en categorías generales, NO para ISINs específicos.
            
            Ejemplos de uso:
            - "Quiero invertir en renta variable europea"
            - "Busco fondos de renta fija en dólares"
            - "Fondos inmobiliarios en Asia"
            - "Quiero invertir en tecnología"
            - "Fondos de deuda corporativa"
            - "Renta variable salud"
            
            Args:
                query: Descripción en lenguaje natural de la categoría de inversión deseada
            """
            try:
                # Search for matching categories using the retriever
                matching_categories = category_retriever_service.search(query, k=10)
                
                if not matching_categories:
                    return f"No se encontraron categorías que coincidan con '{query}'. Intenta ser más específico o usa términos como 'renta variable', 'renta fija', 'Europa', 'USA', etc."
                
                # Build response with categories and their top funds
                response_parts = []
                # response_parts.append(f"Encontré {len(matching_categories)} categorías relevantes para tu búsqueda:\n")
                
                print(f"Matching categories: {matching_categories}")
                for category in matching_categories:
                    category_id = category.get('id')
                    category_name = category.get('fullname') or category.get('name')
                    category_desc = category.get('description', '')
                    
                    response_parts.append(f"\n**{category_name}: {category_desc}**\n")
                    
                    # Get top funds for this category
                    if category_id:
                        top_funds = db.get_funds_by_category_with_history_for_chatbot(category_id, count=10)
                        
                        if top_funds:
                            response_parts.append(f"\n   **Top fondos en esta categoría:**")
                            for fund in top_funds:
                                isin = fund.get('isin', 'N/A')
                                name = fund.get('long_name', 'N/A')
                                ytd = fund.get('ytd_return')
                                ytd_str = f"{ytd:.2f}%" if ytd is not None else "N/A"
                                response_parts.append(f"   - {isin}: {name} - YTD: {ytd_str}")
                        else:
                            response_parts.append(f"   (No hay fondos disponibles con historial en esta categoría)")
                
                response_parts.append("\n\n💡 **Tip**: Puedes pedir más información sobre cualquier fondo específico usando su ISIN.")
                
                return "\n".join(response_parts)
                
            except Exception as e:
                print(f"Error in search_funds_by_category: {e}")
                return f"Hubo un error al buscar fondos para '{query}'. Por favor, intenta reformular tu consulta."

        tools = [return_best_ytd_fund, return_best_last_90d_fund, return_fund_info, return_top_holdings, return_funds_holding_stock, calculate_fund_volatility, return_fund_comparison, return_funds_fees, analyze_drawdowns, search_funds_by_category, return_stock_info, search_stocks_by_sector_country]
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """Eres FundLord AI, un asistente de inversión profesional. Ayudas a los usuarios con:
            - Análisis y recomendaciones de fondos de inversión
            - Análisis de acciones y empresas
            - Portfolio diversification strategies
            - Evaluación del rendimiento de la inversión
            - Evaluación del riesgo y gestión del riesgo
            - Tendencias y perspectivas del mercado
            - Análisis de drawdowns y periodos de recuperación
            - Búsqueda de fondos por categoría y estrategia de inversión
            
            TOOL USAGE GUIDELINES:
            - return_best_ytd_fund: Use cuando usuarios pregunten por fondos con mejor rendimiento anual/YTD
            - return_best_last_90d_fund: Use cuando usuarios pregunten por fondos con mejor rendimiento reciente (90 días)
            - return_fund_info: Use cuando usuarios mencionen un ISIN específico o pregunten sobre un fondo específico - SIEMPRE use este tool para ISINs (formato: 2 letras + 9-10 caracteres alfanuméricos, ej. LU0090845842)
            - return_stock_info: Use cuando usuarios pregunten sobre una acción/stock específica usando ticker o nombre de empresa (ej. "info de JPM", "AAPL", "Tesla", "Microsoft"). Tickers son símbolos cortos de 1-5 caracteres
            - search_stocks_by_sector_country: Use cuando usuarios busquen acciones por sector, país o ambos (ej. "acciones tecnológicas", "empresas de Estados Unidos", "energía en Canadá")
            - return_top_holdings: Use cuando usuarios pregunten sobre las principales inversiones o holdings de un fondo
            - return_funds_holding_stock: Use cuando usuarios pregunten qué fondos invierten en una acción específica (ticker)
            - calculate_fund_volatility: Use cuando usuarios pregunten sobre riesgo, volatilidad o métricas de riesgo de un fondo
            - analyze_drawdowns: Use cuando usuarios pregunten sobre el máximo drawdown, los periodos de recuperación y el riesgo de bajada de un fondo de inversión
            - search_funds_by_category: Use cuando usuarios pregunten sobre invertir en categorías generales (ej. "quiero invertir en renta variable europea", "fondos de tecnología", "inmobiliario japonés", "deuda corporativa")

            IMPORTANTE - DIFERENCIAS CLAVE:
            - ISINs (fondos): Siempre 12 caracteres, empiezan con 2 letras país (ej. LU0090845842, IE0032126645) → usar return_fund_info
            - Tickers (acciones): 1-5 caracteres, símbolos cortos (ej. JPM, AAPL, MSFT, GOOGL, BRK.B) → usar return_stock_info
            - Nombres de empresas (ej. "JPMorgan", "Apple", "Tesla") → usar return_stock_info con el ticker correspondiente

            Para consultas sobre categorías de inversión (tipo de activo, región, sector), usa search_funds_by_category.
            Para consultas sobre fondos específicos con ISIN, usa return_fund_info.
            Para consultas sobre acciones específicas con ticker o nombre de empresa, usa return_stock_info.

            Para todas las otras respuestas, proporciona orientación de inversión útil y precisa mientras se señala que el rendimiento pasado no garantiza resultados futuros.
            Siempre considera la tolerancia al riesgo del usuario y el plazo de inversión en tu asesoría.

            DIRECTRICES DE FORMATO DE SALIDA:
            - Use markdown para formatear la respuesta.
            - Use **texto** para negrita.
            - Use *texto* para cursiva.
            - Use `código en línea` para citar texto o bloques de código pequeños.
            - Use listas ordenadas con 1., 2., 3.
            - Use listas desordenadas con - o *.
            - Use # para títulos de sección (encabezados H1).
            - Use ## para subtítulos (encabezados H2), y así sucesivamente.
            - Use > para citas en bloque (blockquotes).
            - Use --- para un separador (línea horizontal).
            - Use <br> para un salto de línea cuando el Markdown estándar no sea suficiente (ej. dentro de un elemento de lista si necesita una nueva línea).
            """),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

        self.llm = ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=os.getenv("OPENAI_API_KEY"))
        
        agent = create_tool_calling_agent(self.llm, tools, prompt)

        self.executor = AgentExecutor(
            agent=agent,
            tools=tools,
            return_intermediate_steps=True,
            verbose=True,
        )

    def chat(self, message: str, chat_history: List = None):
        """Process a chat message with optional conversation history"""
        if chat_history is None:
            chat_history = []
        
        try:
            result = self.executor.invoke({
                "input": message,
                "chat_history": chat_history
            })
    
            response = result.get("output", "")

            print(f"result: {result}")

            if 'intermediate_steps' in result:
                for action, observation in result['intermediate_steps']:
                    # The 'observation' is the raw output from your tool
                    if isinstance(observation, ToolOutputWithArtifact):
                        print(f"Observation: {observation}")
                        return {
                            'response': response,
                            'artifact': observation.artifact,
                            'isin': observation.isin
                        }
            
            response = response.replace("```", "")
            response = response.replace("\n\n\n", "\n\n")
            
            # Format ISIN codes with bold markdown
            if "STRUCTURED_FUND_DATA:" not in response:
                isin_pattern = r'\b[A-Z]{2}[A-Z0-9]{9}[0-9]\b'
                response = re.sub(isin_pattern, r'**\g<0>**', response)
                
            return response if response else self.DEFAULT_FALLBACK
            
        except Exception as e:
            print(f"Agent error: {str(e)}")
            return self.DEFAULT_FALLBACK