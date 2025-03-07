import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Calendar } from 'lucide-react';

export default function Home() {
  return (
    <div className="bg-white">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              FitLab Tokyo
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              最新のフィットネス設備と専門トレーナーによる指導で、
              あなたの健康的なライフスタイルをサポートします。
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                無料会員登録
              </Link>
              <Link
                to="/courses"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                コースを見る <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-32">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                充実のサービス
              </h2>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-3">
              <div className="flex flex-col bg-gray-400/5 p-8">
                <dt className="text-sm font-semibold leading-6 text-gray-600">マシンジム</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900">¥8,000~/月</dd>
                <dd className="mt-4 text-base leading-7 text-gray-600">24時間利用可能な最新マシン完備</dd>
              </div>
              <div className="flex flex-col bg-gray-400/5 p-8">
                <dt className="text-sm font-semibold leading-6 text-gray-600">ヨガ・ピラティス</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900">¥9,000~/月</dd>
                <dd className="mt-4 text-base leading-7 text-gray-600">月4回の少人数制クラス</dd>
              </div>
              <div className="flex flex-col bg-gray-400/5 p-8">
                <dt className="text-sm font-semibold leading-6 text-gray-600">パーソナル</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-gray-900">¥8,000~/回</dd>
                <dd className="mt-4 text-base leading-7 text-gray-600">完全予約制の個別指導</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}