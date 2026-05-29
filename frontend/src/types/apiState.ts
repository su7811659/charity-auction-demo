import { useSelector } from "react-redux";
import { RootState } from "../store/store";

export enum AsyncStatus {
  Idle = 'idle',
  Loading = 'loading',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

export interface APIState {
  status: AsyncStatus;
  error?: string;
}

export const useApiStatus = (sliceKey: keyof RootState, apiKey: string): APIState => {
  return useSelector((state: RootState) => {
    const slice = state[sliceKey] as any;
    return slice?.apiStatus?.[apiKey] ?? { status: AsyncStatus.Idle, error: undefined };
  });
};
