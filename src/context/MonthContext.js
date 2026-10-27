// Seçili ay tüm sekmelerde ortak olsun diye küçük bir context
import { createContext, useContext, useState } from 'react';
import { toMonthKey } from '../utils/format';

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const [monthKey, setMonthKey] = useState(toMonthKey(new Date()));
  return (
    <MonthContext.Provider value={{ monthKey, setMonthKey }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
