import { useEffect } from "react";
import { useNotifications, NotificationData } from "../hooks/useNotifications";

interface NotificationHandlerProps {
  token: string | null;
  onNavigate: (data: NotificationData) => void;
}

export default function NotificationHandler({ token, onNavigate }: NotificationHandlerProps) {
  const { onNotificationTap } = useNotifications(token);

  useEffect(() => {
    onNotificationTap((data) => {
      onNavigate(data);
    });
  }, [onNotificationTap, onNavigate]);

  return null;
}
