import { wp } from '@/helpers/common';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const CustomInput = ({
  title,
  placeholder,
  value,
  editable,
  onChangeText,
  fieldKey,
  makeEditable
}) => {
const toShow =['roomNumber','adminname'];
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TextInput
          style={[styles.input,{color:'black'}]}
          title={title}
          placeholder={placeholder}
          placeholderTextColor={'black'}
          value={value}
          editable={editable} 
          onChangeText={onChangeText}
          
        />
       
        {toShow.includes(fieldKey) && (
        <TouchableOpacity
          onPress={() => {
            makeEditable(fieldKey);
        }}
        >
          <MaterialCommunityIcons
            name={editable ? "pencil-outline":"pencil-off-outline"  }
            size={24}
            color="black"
            style={styles.icon}
          />
        </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default CustomInput;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', // center horizontally if needed
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: wp(80),
    shadowOffset: { height: 15, width: 10 },
    shadowColor: 'black',
    opacity: 0.5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    borderColor:'black',
    borderWidth:2,
    borderStyle:'solid',
    borderRadius:5 
  },
  input: {
    flex: 1,
    color: 'black',
  },
  icon: {
    marginLeft: 10
  }
});