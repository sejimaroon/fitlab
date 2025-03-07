import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendNewBookingNotification } from '../lib/email';

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
    course_type: string;
  };
}

interface Course {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  course_type: string;
  max_participants: number | null;
  is_monthly: boolean;
  sessions_per_month: number | null;
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

  const dateRange = {
    min: new Date().toISOString().split('T')[0],
    max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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

      // マシンジムコースの場合は時間枠を表示しない
      if (course.course_type === 'gym') {
        setAvailableTimeSlots([{
          start_time: `${date}T00:00:00`,
          end_time: `${date}T23:59:59`
        }]);
        return;
      }

      // 営業時間: 平日 7:00-22:00, 土日 8:00-20:00
      const timeSlots: TimeSlot[] = [];
      const dayOfWeek = selectedDate.getDay(); // 0 (日) から 6 (土) までの曜日
      const openingHour = (dayOfWeek === 0 || dayOfWeek === 6) ? 8 : 7; // 土日は8時から、それ以外は7時から
      const closingHour = (dayOfWeek === 0 || dayOfWeek === 6) ? 20 : 22; // 土日は20時まで、それ以外は22時まで

      for (let hour = openingHour; hour < closingHour; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + course.duration);

        // 既存の予約をチェック
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .eq('course_id', course.id)
          .eq('status', 'confirmed')
          .or(`start_time.lte.${endTime.toISOString()},end_time.gte.${startTime.toISOString()}`);

        // ヨガクラスの場合、参加人数をチェック
        if (course.course_type === 'yoga' && course.max_participants) {
          const { data: participantsCount } = await supabase
            .from('bookings')
            .select('id')
            .eq('course_id', course.id)
            .eq('status', 'confirmed')
            .gte('start_time', startTime.toISOString())
            .lte('end_time', endTime.toISOString());

          if ((participantsCount?.length || 0) >= course.max_participants) {
            continue;
          }
        }

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

      if (!selectedTimeSlot && course.course_type !== 'gym') {
        setError('時間を選択してください');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('認証エラー');

      // プロフィール情報の取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('プロフィールが見つかりません');

      // 予約データの作成
      const bookingData = {
        profile_id: profile.id,
        course_id: course.id,
        start_time: selectedTimeSlot?.start_time || `${selectedDate}T00:00:00`,
        end_time: selectedTimeSlot?.end_time || `${selectedDate}T23:59:59`,
        status: 'confirmed'
      };

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (bookingError) throw bookingError;

      // メール通知
      await sendNewBookingNotification({
        course: {
          name: course.name
        },
        profile: {
          full_name: profile.full_name,
          email: profile.email
        },
        start_time: bookingData.start_time,
        end_time: bookingData.end_time
      });

      onBookingComplete();
      onClose();
    } catch (err) {
      console.error('Booking error:', err);
      setError('予約に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

        {selectedDate && course.course_type !== 'gym' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時間を選択
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableTimeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`py-2 px-4 text-sm rounded-md ${selectedTimeSlot === slot
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
          disabled={loading || (!selectedTimeSlot && course.course_type !== 'gym')}
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        navigate('/login');
        return;
      }

      // プロフィール情報の取得
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // プロフィールが存在しない場合は作成
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              full_name: user.email?.split('@')[0] || 'ゲスト',
              email: user.email
            }
          ])
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw new Error('プロフィールの作成に失敗しました');
        }
        profileData = newProfile;
      }

      setProfile(profileData);

      // 予約情報の取得（修正）
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          course:courses (
            id,
            name,
            price,
            duration,
            course_type
          )
        `)
        .eq('profile_id', profileData.id)
        .gte('start_time', new Date().toISOString()) // 現在以降の予約のみ取得
        .order('start_time');

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError);
        throw new Error('予約情報の取得に失敗しました');
      }

      // コース情報の取得（修正）
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          description,
          duration,
          price,
          course_type,
          max_participants,
          is_monthly,
          sessions_per_month
        `)
        .order('price');

      if (coursesError) {
        console.error('Courses fetch error:', coursesError);
        throw new Error('コース情報の取得に失敗しました');
      }

      setBookings(bookingsData || []);
      setCourses(coursesData || []);
      setError(null);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [navigate]);

  const formatPrice = (course: Course) => {
    if (course.is_monthly) {
      return `月額${course.price.toLocaleString()}円～`;
    }
    return `${course.price.toLocaleString()}円～`;
  };

  const formatDuration = (course: Course) => {
    if (course.course_type === 'gym') {
      return '時間制限なし';
    }
    if (course.sessions_per_month) {
      return `月${course.sessions_per_month}回 ${course.duration}分/回`;
    }
    return `${course.duration}分/回`;
  };

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
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">利用可能なコース</h2>
          <p className="mt-1 text-sm text-gray-500">
            目的や予算に合わせて最適なコースをお選びください
          </p>
        </div>
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {course.name}
                  </h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-2xl font-bold text-indigo-600">
                      {formatPrice(course)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {formatDuration(course)}
                    </span>
                  </div>
                  <p className="mt-3 text-base text-gray-500">
                    {course.description}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCourse(course);
                      setIsBookingModalOpen(true);
                    }}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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