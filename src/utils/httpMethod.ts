
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import httpError from "./httpError";

// Biến lưu trữ Access Token trong Memory (Biến global trong file này)
let accessToken: string | null = null;

export const USER_KEY = "user";

// Hàm cập nhật Access Token sau khi Login hoặc Refresh thành công
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const clearStorage = () => {
  localStorage.removeItem(USER_KEY);
  setAccessToken(null); // Xóa token trong memory
};

export const getUserStorage = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

// ============================================
// GUARD FLAGS & QUEUE - Xử lý đa luồng khi Refresh
// ============================================
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Khởi tạo Axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Thay bằng baseURL của bạn
  timeout: 120000,
  withCredentials: true // QUAN TRỌNG: Để trình duyệt tự gửi HttpOnly Cookie
});


const isPublicEndpoint = (url: string): boolean => {
  return url.startsWith(import.meta.env.VITE_API_URL_PUBLIC)
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Đính kèm Access Token vào header nếu có
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    config.headers["Accept-Language"] = "vi";
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Case: Check business code hoặc redirect HTML (giữ nguyên logic cũ của bạn)
    const data = response?.data;
    if (data?.code === 401 || data?.errorCode === "UNAUTHORIZED") {
      return handle401Error(response.config);
    }
    return response;
  },
  async (error: AxiosError<any>) => {
    const { config, response } = error;

    // Nếu lỗi 401 (Unauthorized) và không phải là request vào public endpoint
    if (response?.status === 401 && config && !isPublicEndpoint(config.url || "")) {
      return handle401Error(config);
    }

    return httpError.unwrap(error);
  }
);

// HÀM XỬ LÝ REFRESH TOKEN TỰ ĐỘNG
async function handle401Error(originalRequest: AxiosRequestConfig) {
  if (isRefreshing) {
    // Nếu đang refresh, bắt các request khác đợi vào hàng chờ
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then((token) => {
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }

  isRefreshing = true;

  try {
    // Gọi API Refresh Token (Trình duyệt tự đính kèm HttpOnly Cookie)
    const res = await axios.post("/auth/refresh-token", {}, { withCredentials: true });
    const newToken = res.data.token; // Giả sử Backend trả Access Token mới ở đây

    setAccessToken(newToken);
    processQueue(null, newToken);
    isRefreshing = false;

    // Thực thi lại request bị lỗi ban đầu
    if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return axiosInstance(originalRequest);

  } catch (refreshError) {
    processQueue(refreshError, null);
    isRefreshing = false;
    signOut(); // Refresh thất bại (RT hết hạn) -> Đăng xuất
    return Promise.reject(refreshError);
  }
}

// SIGN OUT FUNCTION
export const signOut = () => {
  clearStorage();
  // Gọi API logout của backend để xóa Cookie phía Server
  axiosInstance.post("/auth/logout").finally(() => {
    window.location.href = "/login";
  });
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

export default { get, post, put, patch, del, setAccessToken, signOut };