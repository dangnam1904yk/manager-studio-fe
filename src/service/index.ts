import { post } from "../utils/httpMethod";

const PUBLIC_URL = import.meta.env.VITE_API_URL_PUBLIC;

export const apiGetImg = async (params: any) => {
  return post<typeof params, any>(`${PUBLIC_URL}/driver/getImg`, params);
};

export const apiChooseImg = async (payload: any) => {
  return post<typeof payload, any>(`${PUBLIC_URL}/driver/choese-img`, payload);
};
