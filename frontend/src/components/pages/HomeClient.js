'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ChatDemo from '@/components/ChatDemo';

export default function HomeClient() {
  const t = useTranslations('home');

  return (
    <div className="bg-[#fff1e0] min-h-screen">
      {/* Breaking News Banner */}
      <div className="bg-[#315b97] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <span className="font-bold text-sm uppercase mr-4">{t('newBanner')}</span>
            <span className="text-sm">{t('newBannerText')}</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="min-h-[calc(100vh-7rem)] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 w-full py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Text Content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight serif mb-4">
              {t('headline')}
            </h1>
            <h2 className="text-xl md:text-2xl font-light text-gray-800 leading-relaxed mb-6">
              {t('subheadline')}
            </h2>
            <p className="text-base md:text-lg text-gray-700 mb-8">
              {t('heroDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/chat"
                className="btn-newspaper px-8 py-4 text-center inline-block"
              >
                {t('heroCTA1')}
              </Link>
              <Link
                href="/fund"
                className="btn-newspaper-outline px-8 py-4 text-center inline-block"
              >
                {t('heroCTA2')}
              </Link>
            </div>
          </div>

          {/* Right Column - Chat Demo */}
          <div className="relative">
            <ChatDemo />
          </div>
          </div>
        </div>
      </section>

      {/* AI Capabilities Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 border-t-2 border-black">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4 serif">
            {t('capabilitiesTitle')}
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            {t('capabilitiesSubtitle')}
          </p>
        </div>

        {/* Main 3 Capabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Category Search */}
          <Card className="card-newspaper">
            <CardHeader>
              <CardTitle className="serif text-2xl mb-2">{t('categorySearchTitle')}</CardTitle>
              <CardDescription className="text-base">{t('categorySearchDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 border-l-4 border-black p-4 mb-4">
                <p className="text-sm italic text-gray-700 mb-3">&quot;{t('categorySearchExample')}&quot;</p>
                <div className="space-y-2 text-sm">
                  <div className="bg-white border border-gray-300 p-2">
                    <span className="font-bold">{t('categorySearchResult1')}</span>
                    <br />
                    <span className="text-xs text-gray-600">10 funds • Avg YTD: -0.85%</span>
                  </div>
                  <div className="bg-white border border-gray-300 p-2">
                    <span className="font-bold">{t('categorySearchResult2')}</span>
                    <br />
                    <span className="text-xs text-gray-600">8 funds • Avg YTD: 5.20%</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/chat" className="text-sm font-bold underline hover:no-underline">
                {t('categorySearchCTA')} →
              </Link>
            </CardFooter>
          </Card>

          {/* Holdings Analysis */}
          <Card className="card-newspaper">
            <CardHeader>
              <CardTitle className="serif text-2xl mb-2">{t('holdingsTitle')}</CardTitle>
              <CardDescription className="text-base">{t('holdingsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 border-l-4 border-black p-4 mb-4">
                <p className="text-sm italic text-gray-700 mb-3">&quot;{t('holdingsExample')}&quot;</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Taiwan Semiconductor</span>
                    <span className="font-bold">8.45%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Microsoft Corp</span>
                    <span className="font-bold">6.40%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Apple Inc</span>
                    <span className="font-bold">5.42%</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">+ 7 more holdings...</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/chat" className="text-sm font-bold underline hover:no-underline">
                {t('holdingsCTA')} →
              </Link>
            </CardFooter>
          </Card>

          {/* Fee Comparison */}
          <Card className="card-newspaper">
            <CardHeader>
              <CardTitle className="serif text-2xl mb-2">{t('comparisonTitle')}</CardTitle>
              <CardDescription className="text-base">{t('comparisonDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 border-l-4 border-black p-4 mb-4">
                <p className="text-sm italic text-gray-700 mb-3">&quot;{t('comparisonExample')}&quot;</p>
                <div className="space-y-2 text-xs">
                  <div className="bg-white border border-gray-300 p-2">
                    <div className="font-bold mb-1">Candriam Bds Euro Long Term</div>
                    <div>Gestión: <span className="font-bold">0.20%</span> | Éxito: 20.0%</div>
                  </div>
                  <div className="bg-white border border-gray-300 p-2">
                    <div className="font-bold mb-1">Eurizon Fund - Bond EUR</div>
                    <div>Gestión: <span className="font-bold">0.22%</span> | Éxito: N/A</div>
                  </div>
                  <div className="bg-white border border-gray-300 p-2">
                    <div className="font-bold mb-1">AXAWF Euro Long Dur Bd</div>
                    <div>Gestión: <span className="font-bold">0.30%</span> | Éxito: N/A</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/compare" className="text-sm font-bold underline hover:no-underline">
                {t('comparisonCTA')} →
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Additional Capabilities Grid */}
        <div className="border-t-2 border-black pt-8">
          <h3 className="text-2xl font-bold text-black mb-6 serif text-center">
            {t('additionalCapabilitiesTitle')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-black p-6 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-xl mb-2 serif">{t('ytdPerformanceTitle')}</h4>
              <p className="text-sm text-gray-700">{t('ytdPerformanceDesc')}</p>
            </div>
            <div className="bg-white border-2 border-black p-6 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-xl mb-2 serif">{t('volatilityTitle')}</h4>
              <p className="text-sm text-gray-700">{t('volatilityDesc')}</p>
            </div>
            <div className="bg-white border-2 border-black p-6 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-xl mb-2 serif">{t('drawdownTitle')}</h4>
              <p className="text-sm text-gray-700">{t('drawdownDesc')}</p>
            </div>
            <div className="bg-white border-2 border-black p-6 hover:shadow-md transition-shadow">
              <h4 className="font-bold text-xl mb-2 serif">{t('multiFundTitle')}</h4>
              <p className="text-sm text-gray-700">{t('multiFundDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-t-2 border-black">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-12 serif text-center">
          {t('howItWorksTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-[#fff1e0] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black shadow-lg">
              <span className="text-2xl font-bold serif">1</span>
            </div>
            <h3 className="font-bold text-xl text-black mb-3 serif">{t('howItWorksStep1Title')}</h3>
            <p className="text-gray-700">{t('howItWorksStep1Description')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-[#fff1e0] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black shadow-lg">
              <span className="text-2xl font-bold serif">2</span>
            </div>
            <h3 className="font-bold text-xl text-black mb-3 serif">{t('howItWorksStep2Title')}</h3>
            <p className="text-gray-700">{t('howItWorksStep2Description')}</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-[#fff1e0] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black shadow-lg">
              <span className="text-2xl font-bold serif">3</span>
            </div>
            <h3 className="font-bold text-xl text-black mb-3 serif">{t('howItWorksStep3Title')}</h3>
            <p className="text-gray-700">{t('howItWorksStep3Description')}</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black text-[#fff1e0] py-12 md:py-16 border-y-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-bold text-2xl mb-8 uppercase tracking-wide text-center serif">
            {t('statsTitle')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold serif mb-2">44.000+</div>
              <div className="text-sm opacity-90">{t('statsFunds')}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold serif mb-2">€2.4T</div>
              <div className="text-sm opacity-90">{t('statsAssets')}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold serif mb-2">150+</div>
              <div className="text-sm opacity-90">{t('statsMarkets')}</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold serif mb-2">24/7</div>
              <div className="text-sm opacity-90">{t('statsAvailability')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-8 serif text-center">
          {t('faqTitle')}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>{t('faqQuestion1')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer1')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>{t('faqQuestion2')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer2')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>{t('faqQuestion3')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer3')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>{t('faqQuestion4')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer4')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>{t('faqQuestion5')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer5')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>{t('faqQuestion6')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer6')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-7">
            <AccordionTrigger>{t('faqQuestion7')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer7')}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-8">
            <AccordionTrigger>{t('faqQuestion8')}</AccordionTrigger>
            <AccordionContent className="text-gray-700">
              {t('faqAnswer8')}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Final CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-t-4 border-black">
        <div className="bg-black text-[#fff1e0] p-8 md:p-12 border-4 border-black">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 serif text-center">
            {t('ctaTitle')}
          </h2>
          <p className="text-lg mb-6 opacity-90 text-center max-w-2xl mx-auto">
            {t('ctaDescription')}
          </p>
          <p className="text-sm mb-6 text-center opacity-75">
            {t('trustSignal')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/fund"
              className="bg-[#fff1e0] text-black px-8 py-4 font-bold transition-all duration-200 hover:bg-gray-100 uppercase tracking-wide text-center border-2 border-[#fff1e0]"
            >
              {t('ctaExploreFunds')}
            </Link>
            <Link
              href="/chat"
              className="border-2 border-[#fff1e0] text-[#fff1e0] px-8 py-4 font-bold transition-all duration-200 hover:bg-[#fff1e0] hover:text-black uppercase tracking-wide text-center"
            >
              {t('ctaTryAI')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
