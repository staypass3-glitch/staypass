import { CustomAlert } from '@/components';
import React, { createContext, useContext, useState } from 'react';

const AlertContext = createContext();

export const AlertProvider = ({children}) => {
  const [alert,setAlert] = useState({
    visible:false,
    title:'',
    message:'',
    buttons:[]
  });

  const showAlert = (title,message,buttons) =>{
    setAlert({
      title,
      message,
      buttons,
      visible:true,
    });
  };


  const hideAlert = () =>{
    setAlert(prev => ({...prev,visible:false}));
  };

return (
  <AlertContext.Provider value={{showAlert}}>

{children}

      <CustomAlert
   visible={alert.visible}
   title={alert.title}
   message={alert.message}
   buttons={alert.buttons}
   onDismiss={hideAlert}
      />
</AlertContext.Provider >
);
};

export const useAlert = () =>useContext(AlertContext);