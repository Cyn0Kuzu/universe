import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Text, Button, TextInput, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DateTimePickerProps {
  value: Date;
  mode: 'date' | 'time';
  onChange: (event: any, date?: Date) => void;
  minimumDate?: Date;
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
}

/**
 * An improved CustomDateTimePicker component that allows manual input
 */
const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({ 
  value, 
  mode, 
  onChange, 
  minimumDate 
}) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Date state (for date mode)
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  
  // Time state (for time mode)
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  // Update internal state when value prop changes
  useEffect(() => {
    setSelectedDay(value.getDate());
    setSelectedMonth(value.getMonth());
    setSelectedYear(value.getFullYear());
    setSelectedHour(value.getHours());
    setSelectedMinute(value.getMinutes());
  }, [value]);
  
  const handlePress = () => {
    setModalVisible(true);
  };
  
  const handleCancel = () => {
    setModalVisible(false);
    onChange({ type: 'dismissed' }, undefined);
  };
  
  const handleConfirm = () => {
    setModalVisible(false);
    
    let newDate = new Date(value);
    
    if (mode === 'date') {
      // Validate date
      let year = parseInt(selectedYear.toString());
      let month = parseInt(selectedMonth.toString());
      let day = parseInt(selectedDay.toString());
      
      // Ensure the year is reasonable
      if (isNaN(year) || year < 1900 || year > 2100) {
        year = value.getFullYear();
      }
      
      // Ensure month is between 0-11
      if (isNaN(month) || month < 0 || month > 11) {
        month = value.getMonth();
      }
      
      // Get max days in month
      const maxDays = new Date(year, month + 1, 0).getDate();
      
      // Ensure day is valid
      if (isNaN(day) || day < 1 || day > maxDays) {
        day = value.getDate();
      }
      
      newDate = new Date(year, month, day, 
                         value.getHours(), value.getMinutes(), 
                         value.getSeconds());
                         
    } else if (mode === 'time') {
      // Validate time
      let hour = parseInt(selectedHour.toString());
      let minute = parseInt(selectedMinute.toString());
      
      // Ensure hour is between 0-23
      if (isNaN(hour) || hour < 0 || hour > 23) {
        hour = value.getHours();
      }
      
      // Ensure minute is between 0-59
      if (isNaN(minute) || minute < 0 || minute > 59) {
        minute = value.getMinutes();
      }
      
      newDate = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 
                        hour, minute, value.getSeconds());
    }
    
    // Check against minimum date if provided
    if (minimumDate && newDate < minimumDate) {
      newDate = new Date(minimumDate);
    }
    
    onChange({ type: 'set' }, newDate);
  };
  
  // Helper to generate month names
  const getMonthName = (monthIndex: number) => {
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return monthNames[monthIndex];
  };
  
  // Helpers for day/month/year adjustments
  const incrementDay = () => {
    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedDay < maxDays) {
      setSelectedDay(selectedDay + 1);
    } else {
      setSelectedDay(1);
    }
  };
  
  const decrementDay = () => {
    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedDay > 1) {
      setSelectedDay(selectedDay - 1);
    } else {
      setSelectedDay(maxDays);
    }
  };
  
  const incrementMonth = () => {
    if (selectedMonth < 11) {
      setSelectedMonth(selectedMonth + 1);
    } else {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    }
    // Make sure the day is valid for the new month
    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  };
  
  const decrementMonth = () => {
    if (selectedMonth > 0) {
      setSelectedMonth(selectedMonth - 1);
    } else {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    }
    // Make sure the day is valid for the new month
    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  };
  
  const incrementYear = () => {
    setSelectedYear(selectedYear + 1);
  };
  
  const decrementYear = () => {
    setSelectedYear(selectedYear - 1);
  };
  
  // Helpers for hour/minute adjustments
  const incrementHour = () => {
    if (selectedHour < 23) {
      setSelectedHour(selectedHour + 1);
    } else {
      setSelectedHour(0);
    }
  };
  
  const decrementHour = () => {
    if (selectedHour > 0) {
      setSelectedHour(selectedHour - 1);
    } else {
      setSelectedHour(23);
    }
  };
  
  const incrementMinute = () => {
    if (selectedMinute < 59) {
      setSelectedMinute(selectedMinute + 1);
    } else {
      setSelectedMinute(0);
    }
  };
  
  const decrementMinute = () => {
    if (selectedMinute > 0) {
      setSelectedMinute(selectedMinute - 1);
    } else {
      setSelectedMinute(59);
    }
  };
  
  return (
    <View>
      <TouchableOpacity onPress={handlePress}>
        <View style={styles.buttonContainer}>
          <MaterialCommunityIcons 
            name={mode === 'date' ? 'calendar' : 'clock-outline'} 
            size={24} 
            color={theme.colors.primary} 
          />
          <Text style={styles.buttonText}>
            {mode === 'date' 
              ? value.toLocaleDateString('tr-TR') 
              : value.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {mode === 'date' ? 'Tarih Seçin' : 'Saat Seçin'}
            </Text>
            
            {mode === 'date' ? (
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>Gün</Text>
                <View style={styles.spinnerContainer}>
                  <IconButton
                    icon="chevron-up"
                    size={24}
                    onPress={incrementDay}
                  />
                  <TextInput
                    style={styles.spinnerInput}
                    keyboardType="number-pad"
                    value={selectedDay.toString()}
                    onChangeText={(text) => {
                      const day = parseInt(text);
                      if (!isNaN(day)) {
                        const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                        if (day >= 1 && day <= maxDays) {
                          setSelectedDay(day);
                        }
                      } else if (text === '') {
                        setSelectedDay(0); // Allow empty for typing
                      }
                    }}
                    maxLength={2}
                  />
                  <IconButton
                    icon="chevron-down"
                    size={24}
                    onPress={decrementDay}
                  />
                </View>
                
                <Text style={styles.datePickerLabel}>Ay</Text>
                <View style={styles.spinnerContainer}>
                  <IconButton
                    icon="chevron-up"
                    size={24}
                    onPress={incrementMonth}
                  />
                  <Text style={styles.monthText}>
                    {getMonthName(selectedMonth)}
                  </Text>
                  <IconButton
                    icon="chevron-down"
                    size={24}
                    onPress={decrementMonth}
                  />
                </View>
                
                <Text style={styles.datePickerLabel}>Yıl</Text>
                <View style={styles.spinnerContainer}>
                  <IconButton
                    icon="chevron-up"
                    size={24}
                    onPress={incrementYear}
                  />
                  <TextInput
                    style={styles.spinnerInput}
                    keyboardType="number-pad"
                    value={selectedYear.toString()}
                    onChangeText={(text) => {
                      const year = parseInt(text);
                      if (!isNaN(year) && year >= 1900 && year <= 2100) {
                        setSelectedYear(year);
                      } else if (text === '') {
                        setSelectedYear(0); // Allow empty for typing
                      }
                    }}
                    maxLength={4}
                  />
                  <IconButton
                    icon="chevron-down"
                    size={24}
                    onPress={decrementYear}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.timePickerContainer}>
                <Text style={styles.timePickerLabel}>Saat</Text>
                <View style={styles.spinnerContainer}>
                  <IconButton
                    icon="chevron-up"
                    size={24}
                    onPress={incrementHour}
                  />
                  <TextInput
                    style={styles.spinnerInput}
                    keyboardType="number-pad"
                    value={selectedHour.toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const hour = parseInt(text);
                      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                        setSelectedHour(hour);
                      } else if (text === '') {
                        setSelectedHour(0); // Allow empty for typing
                      }
                    }}
                    maxLength={2}
                  />
                  <IconButton
                    icon="chevron-down"
                    size={24}
                    onPress={decrementHour}
                  />
                </View>
                
                <Text style={styles.timePickerSeparator}>:</Text>
                
                <Text style={styles.timePickerLabel}>Dakika</Text>
                <View style={styles.spinnerContainer}>
                  <IconButton
                    icon="chevron-up"
                    size={24}
                    onPress={incrementMinute}
                  />
                  <TextInput
                    style={styles.spinnerInput}
                    keyboardType="number-pad"
                    value={selectedMinute.toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const minute = parseInt(text);
                      if (!isNaN(minute) && minute >= 0 && minute <= 59) {
                        setSelectedMinute(minute);
                      } else if (text === '') {
                        setSelectedMinute(0); // Allow empty for typing
                      }
                    }}
                    maxLength={2}
                  />
                  <IconButton
                    icon="chevron-down"
                    size={24}
                    onPress={decrementMinute}
                  />
                </View>
              </View>
            )}
            
            <View style={styles.buttonRow}>
              <Button mode="outlined" onPress={handleCancel} style={styles.button}>
                İptal
              </Button>
              <Button mode="contained" onPress={handleConfirm} style={styles.button}>
                Tamam
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInfo: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  currentValue: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    width: '45%',
  },
  // Date picker styles
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  datePickerLabel: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerInput: {
    width: 60,
    height: 50,
    textAlign: 'center',
    fontSize: 22,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  monthText: {
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    width: 100,
    textAlign: 'center',
  },
  // Time picker styles
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
  },
  timePickerLabel: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
    position: 'absolute',
    top: -25,
  },
  timePickerSeparator: {
    fontSize: 30,
    marginHorizontal: 10,
    fontWeight: 'bold',
  }
});

export default CustomDateTimePicker;
