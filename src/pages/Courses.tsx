import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Users, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const courses = [
  {
    id: 'gym',
    name: 'マシンジムコース',
    price: '8,000',
    period: '月額',
    description: '24時間利用可能な最新マシン完備のジムで、自分のペースでトレーニング',
    features: [
      '最新のトレーニングマシン完備',
      '24時間利用可能',
      'シャワールーム・ロッカー完備',
      'フリーウェイトエリア利用可能'
    ],
    icon: Dumbbell
  },
  {
    id: 'yoga',
    name: 'ヨガ・ピラティスコース',
    price: '9,000',
    period: '月額',
    description: '少人数制で丁寧な指導。心と体のバランスを整えるクラス',
    features: [
      '月4回の少人数制クラス',
      '経験豊富なインストラクター',
      '初心者から上級者まで対応',
      'マット・ヨガグッズ完備'
    ],
    icon: Users
  },
  {
    id: 'personal',
    name: 'パーソナルトレーニング',
    price: '8,000',
    period: '1回（60分）',
    description: '完全予約制の個別指導で、効率的なトレーニングを実現',
    features: [
      '専属トレーナーによる個別指導',
      'カウンセリング込み',
      '体組成測定付き',
      'プログラム作成'
    ],
    icon: Calendar
  }
];

export default function Courses() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            コース一覧
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            あなたの目的に合わせて最適なコースをお選びください
          </p>
        </div>

        <div className="mt-16 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-x-8">
          {courses.map((course) => {
            const Icon = course.icon;
            return (
              <div key={course.id} className="relative p-8 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    {course.name}
                  </h3>
                  <p className="mt-4 text-gray-500">
                    {course.description}
                  </p>
                  <p className="mt-8">
                    <span className="text-4xl font-extrabold text-gray-900">¥{course.price}</span>
                    <span className="text-base font-medium text-gray-500">/{course.period}</span>
                  </p>
                  <ul className="mt-6 space-y-4">
                    {course.features.map((feature) => (
                      <li key={feature} className="flex">
                        <span className="text-indigo-400 mr-2">✓</span>
                        <span className="text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={user ? `/bookings?course=${course.id}` : '/register'}
                  className="mt-8 block w-full bg-indigo-600 border border-transparent rounded-md py-3 px-6 text-center font-medium text-white hover:bg-indigo-700"
                >
                  {user ? '予約する' : '会員登録して予約'}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              営業時間のご案内
            </h3>
            <div className="mt-5 border-t border-gray-200">
              <dl className="divide-y divide-gray-200">
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">平日</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    7:00 〜 22:00
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">土日祝</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    8:00 〜 20:00
                  </dd>
                </div>
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">休館日</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    年末年始
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}