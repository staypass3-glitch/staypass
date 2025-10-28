import { supabase } from '../lib/supabase';

export const adminService = {
  // Fetch college ID for user
  fetchCollegeId: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('college_id')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  // Fetch user sessions
  fetchSessions: async (userId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, colleges(name)')
      .eq('admin_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  // Create new college
  createCollege: async (collegeName) => {
    const { data, error } = await supabase
      .from('colleges')
      .insert([{ name: collegeName }])
      .select()
      .single();
    
    return { data, error };
  },

  // Update user profile with college ID
  updateUserCollege: async (userId, collegeId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ college_id: collegeId })
      .eq('id', userId);
    
    return { error };
  },

  reactivateSession: async (sessionId) => {
    return await supabase
      .from('sessions')
      .update({ 
        status: 'active',
        end_time: null
      })
      .eq('id', sessionId)
      .select();
  },

  // Create new session
  createSession: async (adminId, collegeId) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        admin_id: adminId,
        college_id: collegeId,
        start_time: new Date(),
        status: 'active',
      }])
      .select()
      .single();
    
    return { data, error };
  },

  // Generate and store QR code
  createQRCode: async (sessionId, collegeId, qrData) => {
    const { error } = await supabase
      .from('qrcodes')
      .insert([{
        session_id: sessionId,
        college_id: collegeId,
        code: qrData,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }]);
    
    return { error };
  },

  // Get QR code for session
  getQRCode: async (sessionId) => {
    const { data, error } = await supabase
      .from('qrcodes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data, error };
  },

  // Upsert QR code
  upsertQRCode: async (sessionId, collegeId, qrData) => {
    const { error } = await supabase
      .from('qrcodes')
      .upsert(
        {
          session_id: sessionId,
          college_id: collegeId,
          code: qrData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        { onConflict: 'session_id' }
      );
    
    return { error };
  },
  

  fetchRequests:async(collegeId) =>{
    const {data,error} = await supabase
    .from('requests')
    .select('*')
    .eq('college_id',collegeId)
    .eq('status','pending')
    .single()

    if(data) return true;
    else false;
  },

  // Deactivate session
  deactivateSession: async (sessionId) => {
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'expired',
        end_time: new Date()
      })
      .eq('id', sessionId);
    
    return { error };
  },

  // Find session by session_id
  findSessionById: async (sessionId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId);
    
    return { data, error };
  },

  // Update user session
  updateUserSession: async (userId, sessionData) => {
    const { error } = await supabase
      .from('profiles')
      .update({
        current_session_id: sessionData?.id,
        college_id: sessionData?.college_id
      })
      .eq('id', userId);
    
    return { error };
  },

  // Check existing session
  checkExistingSession: async (userId, collegeId) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('college_id', collegeId)
      .eq('admin_id', userId)
      .single();
    
    return { data, error };
  },

  // Connect to existing session
  connectToSession: async (userId, sessionData) => {
    const { error } = await supabase
      .from('sessions')
      .insert([{
        admin_id: userId,
        start_time: sessionData?.start_time,
        status: sessionData?.status,
        college_id: sessionData?.college_id,
        created_at: sessionData?.created_at
      }])
      .select()
      .single();
    
    return { error };
  }
};