import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { Colors } from '@/lib/constants';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 3000;
const withAlpha = (color: string, alpha: number): string =>
  color.endsWith(')') ? color.slice(0, -1) + ` / ${alpha})` : color;

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; border: string }> = {
  success: {
    icon: <CheckCircle size={18} color={Colors.success} />,
    bg: withAlpha(Colors.success, 0.08),
    border: withAlpha(Colors.success, 0.25),
  },
  error: {
    icon: <AlertCircle size={18} color={Colors.destructive} />,
    bg: withAlpha(Colors.destructive, 0.08),
    border: withAlpha(Colors.destructive, 0.25),
  },
  info: {
    icon: <Info size={18} color={Colors.primary} />,
    bg: withAlpha(Colors.primary, 0.08),
    border: withAlpha(Colors.primary, 0.25),
  },
  warning: {
    icon: <AlertCircle size={18} color={Colors.warning} />,
    bg: withAlpha(Colors.warning, 0.08),
    border: withAlpha(Colors.warning, 0.25),
  },
};

let toastId = 0;

/**
 * Toast notification provider — wrap the app to enable showToast().
 * Renders non-blocking notifications that auto-dismiss after 3 seconds.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        className="absolute top-0 left-0 right-0 z-50"
        pointerEvents="box-none"
        style={{ paddingTop: 60 }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, TOAST_DURATION - 250);

    return () => clearTimeout(timer);
  }, [translateY, opacity]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: config.border,
        backgroundColor: Colors.surfaceElevated,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        shadowColor: 'oklch(0 0 0)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <View style={{ marginTop: 1 }}>{config.icon}</View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: Colors.foreground,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {toast.title}
        </Text>
        {toast.message ? (
          <Text
            style={{
              color: Colors.mutedForeground,
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {toast.message}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => onDismiss(toast.id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <X size={16} color={Colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Hook to show toast notifications from any component.
 * Must be used within a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
