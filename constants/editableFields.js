// useEditFields.js
import { useState } from 'react';

export const useEditFields = (initialFields = { 
    name: false,
    gmail:false,
    roomNumber:false,
    adminName:false,
 }) => {
  const [editFields, setEditFields] = useState(initialFields);

  const makeEditable = (key) => {
    setEditFields((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return {
    editFields,
    makeEditable
  };
};