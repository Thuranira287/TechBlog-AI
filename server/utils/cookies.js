export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const setCookie = (name, value, days = 30) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Strict${secure}`;
};

export const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const clearServiceCookies = () => {
  document.cookie.split(";").forEach(cookie => {
    const cookieName = cookie.split("=")[0].trim();
    if (cookieName.includes('_ga') || cookieName.includes('_gid') || 
        cookieName === 'IDE' || cookieName === 'test_cookie') {
      deleteCookie(cookieName);
    }
  });
};