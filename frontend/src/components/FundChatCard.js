import Link from 'next/link';

export function FundCard({ fundResponse }) {
  // const { message, fund_data } = fundResponse;
  const {
    isin,
    long_name,
    short_name,
    currency,
    region,
    type_disp,
    previous_close,
    ytd_return,
    last_90d_return,
    analysis
  } = fundResponse;

  const formatReturn = (returnValue) => {
    if (returnValue === null || returnValue === undefined) return 'N/A';
    const sign = returnValue > 0 ? '+' : '';
    return `${sign}${returnValue.toFixed(2)}%`;
  };

  const getReturnColor = (returnValue) => {
    if (returnValue === null || returnValue === undefined) return 'text-gray-600';
    return returnValue > 0 ? 'text-green-600' : returnValue < 0 ? 'text-red-600' : 'text-gray-600';
  };

  return (
    <div className="bg-white border-2 border-black max-w-3xl">
      {/* Newspaper-style header */}
      <div className="bg-black text-[#fff1e0] p-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold serif leading-tight">ANÁLISIS DE FONDO</h3>
          </div>
        </div>
      </div>

      {/* Fund headline */}
      <div className="border-b-2 border-black p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black serif leading-tight mb-3">
          {long_name || short_name || 'Fondo de Inversión'}
        </h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span className="font-mono font-bold">{isin}</span>
          {region && <span>•</span>}
          {region && <span>{region || 'Global'}</span>}
          {currency && <span>•</span>}
          {currency && <span>{currency || 'USD'}</span>}
        </div>
      </div>

      {/* Price and key metrics - newspaper table style */}
      <div className="border-b border-gray-300 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Current Price */}
          <div className="text-center md:text-left">
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
              Precio Actual
            </div>
            <div className="text-3xl font-bold text-black serif">
              {previous_close ? `${previous_close.toFixed(2)}` : 'N/A'}
            </div>
            {currency && <div className="text-xs text-gray-600 uppercase tracking-wide">
              {currency || 'USD'}
            </div>}
          </div>

          {/* YTD Performance */}
          <div className="text-center">
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
              Rendimiento YTD
            </div>
            <div className={`text-3xl font-bold serif ${getReturnColor(ytd_return)}`}>
              {formatReturn(ytd_return)}
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              Año en curso
            </div>
          </div>

          {/* 90-Day Performance */}
          <div className="text-center md:text-right">
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
              Últimos 90 Días
            </div>
            <div className={`text-3xl font-bold serif ${getReturnColor(last_90d_return)}`}>
              {formatReturn(last_90d_return)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4">
        <Link href={`/fund/${isin}`}>
          <p className="block w-full bg-black text-[#fff1e0] py-2 font-bold text-sm transition-all duration-200 hover:bg-gray-800 uppercase tracking-wide text-center rounded">
            Ver Análisis Completo
          </p>
        </Link>
      </div>
    </div>
  );
}