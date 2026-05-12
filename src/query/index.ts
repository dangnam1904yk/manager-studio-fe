import { useMutation } from "@tanstack/react-query";
import { apiGetImg, apiChooseImg } from "../service";

export const useGetImg = () =>
  useMutation({
    mutationKey: ["useGetImg"],
    mutationFn: apiGetImg
  });

export const useChooseImg = () =>
  useMutation({
    mutationKey: ["useChooseImg"],
    mutationFn: apiChooseImg
  });