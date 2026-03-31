import Link from 'next/link';
import {useTranslations} from 'next-intl';

export default function Footer() {
  const tFooter = useTranslations('footer');
  const tHeader = useTranslations('header');
  return (
    <footer className="border-t-2 border-gray-800 bg-[#fff1e0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center">
                <span className="text-[#fff1e0] font-bold text-lg serif">SC</span>
              </div>
              <div className="flex flex-col">
                <span className="text-black font-bold text-xl serif">{tHeader('siteName')}</span>
                <span className="text-gray-600 text-xs font-medium uppercase tracking-wider">{tHeader('siteTagline')}</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm max-w-md leading-relaxed">
              {tFooter('brandDescription')}
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="https://www.linkedin.com/in/javier-chulvi-bernad/" className="text-gray-600 hover:text-black transition-colors duration-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Secciones */}
          <div>
            <h3 className="text-black font-bold mb-4 text-sm uppercase tracking-wide">{tFooter('sectionsTitle')}</h3>
            <ul className="space-y-2">
              <li><Link href="/fund" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">{tFooter('sectionsFunds')}</Link></li>
              <li><Link href="/benchmark" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">{tFooter('sectionsBenchmarks')}</Link></li>
              {/* <li><Link href="/analisis" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">Análisis</Link></li>
              <li><Link href="/economia" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">Economía</Link></li> */}
            </ul>
          </div>

          {/* Herramientas */}
          <div>
            <h3 className="text-black font-bold mb-4 text-sm uppercase tracking-wide">{tFooter('toolsTitle')}</h3>
            <ul className="space-y-2">
              <li><Link href="/chat" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">{tFooter('toolsAIChat')}</Link></li>
              <li><Link href="/compare" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">{tFooter('toolsCompare')}</Link></li>
              {/* <li><Link href="/alertas" className="text-gray-700 hover:text-black text-sm transition-colors duration-200">Alertas</Link></li> */}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-300 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            {tFooter('copyrightLine', {year: new Date().getFullYear()})}
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-gray-600 hover:text-black text-sm transition-colors duration-200">
              {tFooter('legalNotice')}
            </Link>
            <Link href="#" className="text-gray-600 hover:text-black text-sm transition-colors duration-200">
              {tFooter('privacy')}
            </Link>
            <Link href="#" className="text-gray-600 hover:text-black text-sm transition-colors duration-200">
              {tFooter('cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
