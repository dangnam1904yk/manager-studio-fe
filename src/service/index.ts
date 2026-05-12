import { post } from "../utils/httpMethod";

export const apiGetImg = async (params: any) => {
  return post<typeof params, any>(`${import.meta.env.VITE_API_URL}/getImg`, params);
};

export const apiChooseImg = async (payload: any) => {
  return post<typeof payload, any>(`${import.meta.env.VITE_API_URL}/api/choese-img`, payload);
};
