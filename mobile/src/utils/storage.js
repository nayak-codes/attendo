import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'smart_attendance_user_session';

let memoryCache = null;

export const saveUserSession = async (userObj) => {
  try {
    memoryCache = userObj;
    const jsonValue = JSON.stringify(userObj);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, jsonValue);
    }
  } catch (e) {
    console.warn('Error saving user session:', e);
  }
};

export const getUserSession = async () => {
  try {
    if (memoryCache) return memoryCache;

    const nativeData = await AsyncStorage.getItem(STORAGE_KEY);
    if (nativeData) {
      const parsed = JSON.parse(nativeData);
      memoryCache = parsed;
      return parsed;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const webData = window.localStorage.getItem(STORAGE_KEY);
      if (webData) {
        const parsed = JSON.parse(webData);
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading user session:', e);
  }
  return null;
};

export const clearUserSession = async () => {
  try {
    memoryCache = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Error clearing user session:', e);
  }
};
