import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  user_id: string;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  course: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
}

interface Course {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

// 予約モーダルコンポーネント
function BookingModal({ 
  course, 
  isOpen, 
  onClose, 
  onBookingComplete 
}: { 
  course: Course; 
  isOpen: boolean; 
  onClose: () => void;
  onBookingComplete: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 予約可能な日付の範囲を計算
  const getDateRange = () => {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 1);
    return {
      min: minDate,
      max: maxDate.toISOString().split('T')[0]
    };
  };

  // 年末年始かどうかをチェック
  const isHoliday = (date: Date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return (month === 12 && day >= 29) || (month === 1 && day <= 3);
  };

  // 利用可能な時間枠を取得
  const fetchAvailableTimeSlots = async (date: string) => {
    try {
      setLoading(true);
      setError(null);

      const selectedDate = new Date(date);
      if (isHoliday(selectedDate)) {
        setError('選択された日付は休業日です');
        setAvailableTimeSlots([]);
        return;
      }

      // 営業時間: 9:00-18:00
      const timeSlots: TimeSlot[] = [];
      for (let hour = 9; hour < 18; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(hour + 1);

        // 既存の予約をチェック
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('status', 'confirmed')
          .or(`start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`);

        if (!existingBookings?.length) {
          timeSlots.push({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          });
        }
      }

      setAvailableTimeSlots(timeSlots);
    } catch (err) {
      setError('時間枠の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 予約を確定
  const handleBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedTimeSlot) {
        setError('時間を選択してください');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証エラー');

      // プロフィールIDの取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('プロフィールが見つかりません');

      // 予約データの作成
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          profile_id: profile.id,
          course_id: course.id,
          start_time: selectedTimeSlot.start_time,
          end_time: selectedTimeSlot.end_time,
          status: 'confirmed'
        }]);

      if (bookingError) throw bookingError;

      onBookingComplete();
      onClose();
    } catch (err) {
      setError('予約に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const dateRange = getDateRange();

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{course.name}の予約</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            日付を選択
          </label>
          <input
            type="date"
            min={dateRange.min}
            max={dateRange.max}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              fetchAvailableTimeSlots(e.target.value);
            }}
            className="w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>

        {selectedDate && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時間を選択
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableTimeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`py-2 px-4 text-sm rounded-md ${
                    selectedTimeSlot === slot
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {new Date(slot.start_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleBooking}
          disabled={loading || !selectedTimeSlot}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? '予約中...' : '予約を確定する'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // プロフィール情報の取得
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw new Error('プロフィールの取得に失敗しました');

      // プロフィールが存在しない場合は作成
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              full_name: user.email?.split('@')[0] || 'ゲスト',
            }
          ])
          .select()
          .single();

        if (createError) throw new Error('プロフィールの作成に失敗しました');
        profileData = newProfile;
      }

      setProfile(profileData);

      // 予約情報の取得
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          course:courses (
            *
          )
        `)
        .eq('profile_id', profileData.id)
        .order('start_time', { ascending: true });

      if (bookingsError) throw new Error('予約情報の取得に失敗しました');

      // コース情報の取得
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('price');

      if (coursesError) throw new Error('コース情報の取得に失敗しました');

      setBookings(bookingsData || []);
      setCourses(coursesData || []);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* プロフィールセクション */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
        {profile && (
          <p className="mt-2 text-gray-600">ようこそ、{profile.full_name}さん</p>
        )}
        {location.state?.message && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
            {location.state.message}
          </div>
        )}
      </div>

      {/* 予約状況セクション */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">予約状況</h2>
        </div>
        <div className="border-t border-gray-200">
          {bookings.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <li key={booking.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600">
                        {booking.course.name}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {new Date(booking.start_time).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center text-gray-500">
              予約はありません
            </div>
          )}
        </div>
      </div>

      {/* コース一覧セクション */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">利用可能なコース</h2>
          <p className="mt-1 text-sm text-gray-500">
            予約したいコースを選択してください
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200"
              >
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {course.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {course.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-2xl font-bold text-gray-900">
                      ¥{course.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({course.duration}分)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsBookingModalOpen(true);
                    }}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    予約する
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 予約モーダル */}
      {selectedCourse && (
        <BookingModal
          course={selectedCourse}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedCourse(null);
          }}
          onBookingComplete={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}