import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
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
        }).then(({ synced, failed }) => {
          if (failed > 0) {
            const syncedMsg = synced > 0 ? `${synced} change${synced !== 1 ? "s" : ""} synced. ` : "";
            Alert.alert(
              "Sync incomplete",
              `${syncedMsg}${failed} item${failed !== 1 ? "s" : ""} couldn't be saved and will retry next time you reconnect.\n\nIf this keeps happening, check your connection and try refreshing the screen.`,
              [{ text: "OK" }]
            );
          }
        });
      }
    });
    return () => unsub();
  }, []);

  return { isOnline };
}
