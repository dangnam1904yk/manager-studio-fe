import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import httpError from "./httpError";

export const TOKEN_KEY = "token";
export const USER_KEY = "user";


// ============================================
// TOKEN CACHE - Cache token check để tối ưu performance
// ============================================
let cachedToken: string | null = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_TTL = 100; // Cache 100ms

// Export function để invalidate cache khi token thay đổi
export const invalidateTokenCache = () => {
  cachedToken = null;
  tokenCacheTime = 0;
};

export const clearStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  invalidateTokenCache(); // Invalidate cache khi clear storage
};

export const getUserStorage = () => {
  if (localStorage.getItem(USER_KEY)) {
    return JSON.parse(localStorage?.getItem(USER_KEY) || "") as any;
  }

  return null;
};

// export const getTokenStorage = (): string => {
//   const token = window.localStorage.getItem(TOKEN_KEY);
//   if (token && isString(token)) {
//     return JSON.parse(token);
//   }

//   return "";
// };

// ============================================
// TOKEN CHECK - Cache token check để tối ưu
// ============================================
const getAccessToken = (): string | null => {
  try {
    // Nếu cache còn valid, return cache
    const now = Date.now();
    if (cachedToken !== null && now - tokenCacheTime < TOKEN_CACHE_TTL) {
      return cachedToken;
    }

    // Check token
    // const token = getTokenStorage();
    // if (token && typeof token === "string" && token.trim() !== "") {
    //   cachedToken = token;
    //   tokenCacheTime = now;
    //   return token;
    // }

    // Token không hợp lệ
    cachedToken = null;
    tokenCacheTime = now;
    return null;
  } catch {
    cachedToken = null;
    tokenCacheTime = Date.now();
    return null;
  }
};

// Export function để check token (có thể dùng ở nơi khác nếu cần)
export const hasValidToken = (): boolean => {
  return getAccessToken() !== null;
};

// ============================================
// GUARD FLAGS - Tránh loop và conflict
// ============================================
let isSigningOut = false;
let isLoggingIn = false;

// Export functions để set flags từ nơi khác
export const setSigningOut = (value: boolean) => {
  isSigningOut = value;
  // Reset flag sau 5s để tránh stuck
  if (value) {
    setTimeout(() => {
      isSigningOut = false;
    }, 5000);
  }
};

export const setLoggingIn = (value: boolean) => {
  isLoggingIn = value;
  // Reset flag sau 10s để tránh stuck
  if (value) {
    setTimeout(() => {
      isLoggingIn = false;
    }, 10000);
  }
};

// Khởi tạo Axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: "",
  timeout: 120000
});


// Các hàm lưu trữ dữ liệu vào localStorage
export const saveTokenStorage = (token: string) => {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  invalidateTokenCache(); // Invalidate cache khi token thay đổi
};

// ATTACH TOKEN TO HEADER - Deprecated
// k cần dùng nữa vì request interceptor đã tự động attach token
// Giữ lại để backward compatibility nhưng không làm gì
export const attachTokenToHeader = (token: string) => {
  // Interceptor đã tự động attach token từ localStorage
  // Không cần làm gì ở đây, chỉ invalidate cache để force reload token
  invalidateTokenCache();
};

// CENTRALIZED TOKEN CHECT - XỬ NÝ Ở ĐÂY DUY NHẤT
// Whitelist các endpoint K cần token (login, logout, captcha, etc.)
const PUBLIC_ENDPOINTS = [
  "/getImg"
];

// Helper function để check xem endpoint có cần token không
const isPublicEndpoint = (url: string, baseURL?: string): boolean => {
  if (!url) return false;

  // Nếu có baseURL, kết hợp với url để check
  const fullUrl = baseURL ? `${baseURL}${url}` : url;

  // Check xem URL có chứa bất kỳ public endpoint nào K
  // Cần check cả relative path và full URL
  return PUBLIC_ENDPOINTS.some(endpoint => {
    // Check trong ALL URL hoặc chỉ trong path
    return fullUrl.includes(endpoint) || url.includes(endpoint);
  });
};

// REQUEST INTERCEPTOR - Token check và header setup
axiosInstance.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    const baseURL = config.baseURL || axiosInstance.defaults.baseURL || "";
    const token = getAccessToken();

    // Nếu là public endpoint (login, logout, captcha), cho phép đi qua không cần token
    if (isPublicEndpoint(url, baseURL)) {
      // Nếu có token, vẫn attach vào header (cho logout - có thể cần token)
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["X-Access-Token"] = `${token}`;
        config.headers["Accept-Language"] = "vi";
      } else if (config.headers) {
        // Nếu không có token, chỉ set Accept-Language (cho login, captcha)
        config.headers["Accept-Language"] = "vi";
      }
      return config;
    }

    // Với các endpoint khác (không phải public), yêu cầu token
    if (!token) {
      const error = new Error("No token available - request cancelled");
      // Reject promise để ngăn request được gửi đi
      return Promise.reject(error);
    }

    // Nếu có token, attach vào header và cho phép request tiếp tục
    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["X-Access-Token"] = `${token}`;
      config.headers["Accept-Language"] = "vi";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Gộp tất cả logic vào một nơi
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {

    // Case: bị redirect về trang login (các proxy/SSO trả về HTML)
    const contentType = (response.headers?.["content-type"] || "").toString().toLowerCase();
    if (contentType.includes("text/html")) {
      // Chỉ signOut nếu không đang trong quá trình logout/login
      if (!isSigningOut && !isLoggingIn) {
        signOut();
      }
      return Promise.reject(new Error("Session expired (HTML redirect)"));
    }

    // Case: backend trả 200 nhưng body báo hết phiên (business code)
    const data: any = response?.data;
    if (
      data &&
      (data.code === 401 ||
        data.status === 401 ||
        data?.errorCode === "UNAUTHORIZED" ||
        data?.message === "UNAUTHORIZED")
    ) {
      // Chỉ signOut nếu không đang trong quá trình logout/login
      if (!isSigningOut && !isLoggingIn) {
        signOut();
      }
      return Promise.reject(new Error("Session expired (business code)"));
    }

    return response;
  },
  (error: AxiosError<any>) => {
    const { config, response } = error;

    if (!config) {
      // Dùng httpError.unwrap để handle error
      return httpError.unwrap(error);
    }

    // Unauthorized (mở rộng thêm các mã thường dùng do proxy/framework)
    const status = response?.status;
    const isUnauthorized =
      status === 401 || status === 403 || status === 419 || status === 440 || status === 498;

    // Chỉ signOut nếu:
    // 1. Không đang trong quá trình logout/login
    // 2. Không phải public endpoint (tránh loop khi logout)
    if (isUnauthorized && !isSigningOut && !isLoggingIn) {
      const url = config.url || "";
      const baseURL = config.baseURL || "";
      // Không signOut cho public endpoints (login, logout, captcha)
      if (!isPublicEndpoint(url, baseURL)) {
        signOut();
      }
    }

    // Dùng httpError.unwrap để handle error
    return httpError.unwrap(error);
  }
);

// SIGN OUT FUNCTION
export const signOut = () => {
  // Nếu đang trong quá trình sign out, bỏ qua
  if (isSigningOut) return;
  isSigningOut = true;

  clearStorage();

  // Reset flag sau 100ms để cho phép redirect hoàn tất
  setTimeout(() => {
    isSigningOut = false;
  }, 100);


};

// Các hàm call API
export const get = <T = any, R = T, D = any>(
  url: string,
  config?: AxiosRequestConfig<D>
): Promise<AxiosResponse<R, D>> => {
  return axiosInstance.get<T, AxiosResponse<R>, D>(url, config);
};

export const post = <D, R>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<R>> => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .post<D, AxiosResponse<R>>(url, data, config)
      .then((response) => resolve(response))
      .catch((error: AxiosError) => reject(error.response?.data));
  });
};

export const put = <D, R>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<R>> => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .put<D, AxiosResponse<R>>(url, data, config)
      .then((response) => resolve(response))
      .catch((error: AxiosError) => reject(error.response?.data));
  });
};

export const patch = <D, R>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<R>> => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .patch<D, AxiosResponse<R>>(url, data, config)
      .then((response) => resolve(response))
      .catch((error: AxiosError) => reject(error.response?.data));
  });
};

export const del = <D = any, R = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .delete<D, AxiosResponse<R>>(url, config)
      .then((response) => resolve(response.data))
      .catch((error: AxiosError) => reject(error.response?.data));
  });
};

export default {
  get,
  post,
  put,
  patch,
  del
};
