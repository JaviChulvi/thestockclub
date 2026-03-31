import os
import json
import sys
from typing import List, Dict, Any, Optional
from openai import OpenAI

backend_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)
from database.repositories.category_repository import CategoryRepository
from vector.config import vector_config

# Initialize OpenAI client using shared configuration
try:
    openai_client = OpenAI(api_key=vector_config.get_openai_api_key())
except Exception as e:
    print(f"Error inicializando cliente OpenAI: {e}")
    sys.exit(1)


# --- 2. Lógica de OpenAI (Extracción y Embeddings) ---

class OpenAIService:
    """Encapsula las llamadas a la API de OpenAI con configuración compartida."""

    def extract_metadata_and_describe(self, category_fullname: str) -> Optional[Dict[str, Any]]:
        """
        Usa un LLM para extraer metadatos estructurados y generar una descripción
        optimizada para búsqueda semántica basada en el nombre completo de la categoría.
        """
        print(f"--- Procesando: {category_fullname} ---")
        
        system_prompt = """
        Eres un experto en fondos de inversión y análisis financiero. Tu tarea es analizar
        el "fullname" de una categoría de fondo de inversión y extraer metadatos estructurados
        en formato JSON, junto con una descripción optimizada para búsqueda semántica.

        Columnas a extraer:
        - active_type: (Renta Fija, Renta Variable, Mixto, Alternativo, Inmobiliario, Monetario, Otro)
        - region: (Europa, USA, Asia, America Latina, Africa, Oceania, Global, Otro)
        - currency: (EUR, USD, GBP, JPY, CHF, Otro)
        - sub_category: (Deuda Corporativa, Deuda Pública, Event Driven, Convertibles, Agresivo, Defensivo, Small/Mid-Cap, Otro)
        - hedged_currency: (EUR Cubierto, USD Cubierto, GBP Cubierto, JPY Cubierto, N/A, Otro)
        - description: Genera una descripción optimizada para búsqueda semántica (3-4 oraciones, 100-150 palabras)

        IMPORTANTE para la descripción:
        La descripción de la CATEGORÍA de fondos de inversión (NO UN FONDO DE INVERSIÓN) debe estar optimizada para búsqueda semántica e incluir:
        
        1. **Estrategia de inversión principal de la categoría** (clara y específica)
        2. **Palabras clave relevantes** que un inversor usaría para buscar esta categoría
        3. **Términos técnicos y coloquiales** para la misma estrategia de la categoría
           - Ejemplo: "renta variable" = "acciones" = "equity" = "bolsa"
           - Ejemplo: "renta fija" = "bonos" = "deuda" = "obligaciones"
        4. **Contexto de uso** (cuándo un inversor elegiría esta categoría)
        5. **Sinónimos y variaciones** de términos clave de la categoría

        Ejemplos de búsquedas de usuarios que deben coincidir:
        - "Quiero invertir en tecnología"
        - "Fondos seguros para jubilación"
        - "Inversión en mercados emergentes"
        - "Fondos que protejan contra inflación"
        - "Acciones europeas"
        - "Bonos corporativos"

        Usa lenguaje natural que los usuarios realmente escribirían para buscar esta categoría.
        Prioriza claridad y variedad de términos sobre brevedad.

        Reglas:
        - Responde SÓLO con el objeto JSON, nada más.
        - Si un valor no se puede deducir del nombre, usa "Otro" o "N/A" según corresponda.
        - La 'description' DEBE ser generada con 3-4 oraciones ricas en sinónimos y términos relacionados.
        """

        user_prompt = f"Analiza esta categoría: {category_fullname}"

        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",  # Using gpt-4o for better quality
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            json_response = json.loads(response.choices[0].message.content)
            print(f"  > Metadatos extraídos (LLM): {json_response}")
            return json_response
        
        except Exception as e:
            print(f"Error al procesar con LLM la categoría '{category_fullname}': {e}")
            return None

    def get_embedding(self, text: str) -> Optional[List[float]]:
        """
        Genera un vector de embedding para el texto proporcionado usando configuración compartida.
        """
        if not text or not isinstance(text, str):
            print("  > Error: Se necesita texto válido para crear el embedding.")
            return None
            
        try:
            # Use shared embeddings configuration
            response = openai_client.embeddings.create(
                model=vector_config.EMBEDDING_MODEL,
                input=text.strip()
            )
            embedding = response.data[0].embedding
            print(f"  > Embedding creado (vector de {len(embedding)} dimensiones).")
            return embedding
        except Exception as e:
            print(f"Error al crear embedding para el texto '{text}': {e}")
            return None

def main():
    """
    Script principal para orquestar el proceso de enriquecimiento de datos.
    """
    print("Iniciando el script de enriquecimiento de categorías...")
    category_repo = CategoryRepository()
    openai_service = OpenAIService()
    
    # 1. Obtener todas las categorías de la BD
    categories = category_repo.get_all_categories()
    if not categories:
        print("No se encontraron categorías para procesar.")
        return

    print(f"\nSe encontraron {len(categories)} categorías para procesar.\n")
    processed_count = 0
    for category in categories:
        category_name = category["name"]
        category_fullname = category["fullname"]

        if not category_fullname:
            print(f"Saltando categoría con ID {category['id']} (sin 'fullname').")
            continue

        try:
            # 2. Extraer metadatos y generar descripción con LLM
            metadata = openai_service.extract_metadata_and_describe(category_fullname)
            if not metadata or 'description' not in metadata:
                print(f"  > Error: No se pudo extraer metadatos o descripción para '{category_fullname}'.")
                continue

            generated_description = metadata["description"]

            # 3. Generar embedding a partir de la nueva descripción
            embedding_vector = openai_service.get_embedding(generated_description)
            if not embedding_vector:
                print(f"  > Error: No se pudo generar embedding para '{category_fullname}'.")
                continue

            # 4. Actualizar la categoría en la BD
            success = category_repo.update_category(
                category_id=category["id"],
                fullname=category_fullname,
                description=generated_description,
                active_type=metadata["active_type"],
                region=metadata["region"],
                currency=metadata["currency"],
                sub_category=metadata["sub_category"],
                hedged_currency=metadata["hedged_currency"],
                embedding=embedding_vector
            )

            if success:
                print(f"  > Éxito: Categoría ID {category['id']} (Name: {category_name}) actualizada.\n")
                processed_count += 1
            else:
                print(f"  > Error: No se pudo actualizar la categoría {category_name} en la BD.\n")

        except Exception as e:
            print(f"Error fatal procesando {category_name}: {e}\n")

    print(f"--- Proceso completado ---")
    print(f"Se procesaron y actualizaron exitosamente {processed_count} de {len(categories)} categorías.")


if __name__ == "__main__":
    main()