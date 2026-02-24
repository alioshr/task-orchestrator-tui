import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface FormActiveContextValue {
  isFormActive: boolean;
  register: () => () => void;
}

const FormActiveContext = createContext<FormActiveContextValue>({
  isFormActive: false,
  register: () => () => {},
});

export function FormActiveProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const register = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
    return () => {
      countRef.current -= 1;
      setCount(countRef.current);
    };
  }, []);

  const value = useMemo(() => ({ isFormActive: count > 0, register }), [count, register]);

  return (
    <FormActiveContext.Provider value={value}>
      {children}
    </FormActiveContext.Provider>
  );
}

export function useFormActive() {
  return useContext(FormActiveContext);
}
