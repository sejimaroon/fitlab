import { supabase } from './supabase';

// メール送信用の関数をSupabaseのEdge Functionsに移行
export const sendNewUserNotification = async (userData: {
  full_name: string;
  email: string;
  address: string;
  phone: string;
  birth_date: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'new-user',
        userData
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('メール送信エラー:', error);
    // エラーを上位に伝播させるが、ユーザー体験を損なわないように
    // メール送信の失敗は致命的なエラーとして扱わない
    return null;
  }
};

export const sendNewBookingNotification = async (bookingData: {
  course: { name: string };
  profile: { full_name: string; email: string };
  start_time: string;
  end_time: string;
}) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'new-booking',
        bookingData
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('メール送信エラー:', error);
    // エラーを上位に伝播させるが、ユーザー体験を損なわないように
    // メール送信の失敗は致命的なエラーとして扱わない
    return null;
  }
};