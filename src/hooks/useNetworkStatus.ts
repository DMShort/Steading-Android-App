import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { flushQueue } from "../services/offlineQueue";
import { queryClient } from "../providers/QueryProvider";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);

      setIsOnline(online);

      if (!online) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        flushQueue(() => {
          queryClient.invalidateQueries();
        });
      }
    });
    return () => unsub();
  }, []);

  return { isOnline };
}
