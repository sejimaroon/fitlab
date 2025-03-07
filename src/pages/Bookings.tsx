import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Course {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
}

export default function Booking() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
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
    
    // 12月29日から1月3日までを休業日とする
    return (month === 12 && day >= 29) || (month === 1 && day <= 3);
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        if (!courseId) {
          setError('コースIDが指定されていません');
          return;
        }

        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (error) throw error;
        if (!data) {
          setError('コースが見つかりませんでした');
          return;
        }

        setCourse(data);
      } catch (err) {
        console.error('Error fetching course:', err);
        setError('コースの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

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
      for (let hour = 7; hour < 22; hour++) {
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
      console.error('Error fetching time slots:', err);
      setError('利用可能な時間枠の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    fetchAvailableTimeSlots(date);
  };

  const handleBooking = async () => {
    try {
      if (!course || !selectedTime) {
        setError('予約情報が不完全です');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const bookingData = {
        profile_id: user.id,
        course_id: courseId,
        start_time: selectedTime.start_time,
        end_time: selectedTime.end_time,
        status: 'confirmed'
      };

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([bookingData]);

      if (bookingError) throw bookingError;

      navigate('/dashboard', { 
        state: { message: '予約が完了しました' }
      });
    } catch (err) {
      console.error('Booking error:', err);
      setError('予約に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const dateRange = getDateRange();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">予約</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {course && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{course.name}</h2>
          <p className="text-gray-600 mb-4">
            所要時間: {course.duration}分 / 料金: ¥{course.price.toLocaleString()}
          </p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            日付を選択
          </label>
          <input
            type="date"
            min={dateRange.min}
            max={dateRange.max}
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {selectedDate && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時間を選択
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableTimeSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2 px-4 text-sm rounded-md ${
                    selectedTime === slot
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
          disabled={!selectedDate || !selectedTime}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          予約を確定する
        </button>
      </div>
    </div>
  );
}