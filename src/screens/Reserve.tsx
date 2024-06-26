import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Dimensions} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import Dialog from 'react-native-dialog';


import styles from './Styles'
import Seat from './Seat'
import Timer from './Timer'
import Button from './Button'
import QRButton from './QRButton'
import { flagSeat, claimSeat, leaveSeat, breakSeat } from './SeatManagement';
import SeatInfo from './SeatInfo';
import Scanner from './Scanner'
import { NUM_ROWS, SEATS_PER_ROW, OCCUPIED_API, BREAK_SEATS, DURATION } from './Constants';

async function sendPushNotification(expoPushToken: string, seatNumber: number, timeRemaining: number) {

  const finishTime = new Date();
  finishTime.setSeconds(finishTime.getSeconds() + timeRemaining);

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: seatNumber === null ? 'Get back to your seat!' : `Get back to seat ${seatNumber}!`,
    body: `Your break finishes at ${finishTime.getHours()}:${finishTime.getMinutes() < 10 ? '0' : ''}${finishTime.getMinutes()}`,
  };


  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}


export default function Reserve({ expoPushToken }) {

//     const { expoPushToken } = route.params;
  console.log("in reserve " + expoPushToken);


  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]); // Track occupied seats
  // the seats that are on break
  const [timedWaitSeats, setTimedWaitSeats] = useState<number[]>(BREAK_SEATS); // Track seats in timed wait state
  // temp solution before ownership is added to db
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null) // currently selected seat
  // flagged seats
  const [flaggedSeats, setFlaggedSeats] = useState<number[]>([]);


  // timer
  const [timer, setTimer] = useState<{ [key: number]: number }>({}); // Timer state for seats

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [index, setIndex] = useState<number | null>(null);

  navigation
    const navigation = useNavigation();

  // websocket - duplicated - need to remove duplication
  var ws = useRef(new WebSocket('wss://libraryseat-62c310e5e91e.herokuapp.com')).current;


  useEffect(() => {
    const connectWebSocket = () => {
      ws.onopen = () => {
        console.log("connected to server");
      };
      ws.onclose = (e) => {
        console.log("Closing connection + reconnecting ");
        console.log(e);
        connectWebSocket();
      };
      ws.onerror = (e) => {
        console.log("Error, " + e)
      };
      ws.onmessage = (e) => {
        console.log(e.data);

        const result = parseMessage(e.data);

        setOccupiedSeats(result.booked);
        setFlaggedSeats(result.flagged);
        setTimedWaitSeats(result.break);

      };


    }
    connectWebSocket();
  }, []
  )

  // duplicate - should remove when refactoring
  const parseMessage = (message) => {
    const result = {
      booked: [],
      flagged: [],
      break: []
    };

    const bookedMatch = message.match(/booked: \{([^\}]*)\}/);
    const flaggedMatch = message.match(/flagged: \{([^\}]*)\}/);
    const breakMatch = message.match(/break: \{([^\}]*)\}/);

    if (bookedMatch && bookedMatch[1]) {
      result.booked = bookedMatch[1].split(', ').map(Number);
    }

    if (flaggedMatch && flaggedMatch[1]) {
      result.flagged = flaggedMatch[1].split(', ').map(Number);
    }

    if (breakMatch && breakMatch[1]) {
      result.break = breakMatch[1].split(', ').map(Number);
    }

    return result;
  };


  // API call to fetch occupiedSeats
  //   useEffect(() => {
  //     const fetchOccupiedSeats = async () => {
  //       try {
  //         const response = await fetch(OCCUPIED_API);
  //         if (!response.ok) {
  //           throw new Error('Failed to fetch occupied seats');
  //         }
  //         const data = await response.json(); // what we get form the API
  //         const occupied = data.results.map(item => parseInt(item.seat_number));
  //         console.log(occupied);
  //         setOccupiedSeats(occupied);
  //         const breakSeats = data.results.filter(item => item.on_break).map(item => parseInt(item.seat_number));
  //         setTimedWaitSeats(breakSeats);
  //       } catch (err) {
  //         console.log(err);
  //       }
  //     };
  //     fetchOccupiedSeats();
  //   }, []);

  // timer implementation
  useEffect(() => {
    if (selectedSeat === null) return;
    const interval = setInterval(() => {
      setTimer(prevTimers => {
        const newTimers = { ...prevTimers };
        if (newTimers[selectedSeat] > 0) {
          newTimers[selectedSeat] -= 1;
          // for testing - send notification 5 seconds in
          if (newTimers[selectedSeat] === 5 && timedWaitSeats.includes(selectedSeat)) {
            sendPushNotification(expoPushToken, selectedSeat, newTimers[selectedSeat]);
          }
          if (newTimers[selectedSeat] === 0 && timedWaitSeats.includes(selectedSeat)) {
            flagSeat(ws, selectedSeat, flaggedSeats, setFlaggedSeats, setOccupiedSeats, setTimedWaitSeats);
            // leaveSeat(ws, selectedSeat, timedWaitSeats, setTimedWaitSeats, occupiedSeats, setOccupiedSeats, setSelectedSeat);

          }
        }
        return newTimers;
      });
    }, DURATION);

    return () => clearInterval(interval);
  }, [selectedSeat, timer]);

  const handlePress = (index: number) => {
    if (selectedSeat === null) {
      setIndex(index);
      setIsDialogVisible(true);

//       Alert.alert(
//         `Claiming seat #${index}`,
//         `Do you want to claim seat #${index}?`,
//         [
//           { text: "Cancel", style: "cancel" },
//           { text: "Yes", onPress: () => claimSeat(ws, index, occupiedSeats, timedWaitSeats, flaggedSeats, setOccupiedSeats, setSelectedSeat, setTimedWaitSeats, setFlaggedSeats) }
//         ]
//       );
    }
  };

  // Start of JSX code

  const hasSeat = () => selectedSeat !== null || occupiedSeats.includes(selectedSeat);
  const awayFromDesk = () => hasSeat() && timedWaitSeats.includes(selectedSeat);
  const isFlagged = () => selectedSeat !== null && flaggedSeats.includes(selectedSeat);
//     const isNowhere = !occupiedSeats.includes(selectedSeat) && !flaggedSeats.includes(selectedSeat) && !timedWaitSeats.includes(selectedSeat);
//     const collectBelongings = selectedSeat !== null && isNowhere

  const isNowhere = () => {
    return !occupiedSeats.includes(selectedSeat) && !flaggedSeats.includes(selectedSeat) && !timedWaitSeats.includes(selectedSeat);
  };


  useEffect(() => {
   if (selectedSeat !== null && isNowhere) {
     ws.onmessage = (e) => {
       const result = parseMessage(e.data);
       setOccupiedSeats(result.booked);
       setFlaggedSeats(result.flagged);
       setTimedWaitSeats(result.break);
     };
   }
  }, [selectedSeat, isNowhere]);


  const navToCamera = () => {
    console.log("Loading camera");
    navigation.navigate("Scanner", {
      ws : ws,
      occupiedSeats: occupiedSeats,
      timedWaitSeats: timedWaitSeats,
      flaggedSeats: flaggedSeats,
      setOccupiedSeats: setOccupiedSeats,
      setSelectedSeat: setSelectedSeat,
      setTimedWaitSeats: setTimedWaitSeats,
      setFlaggedSeats: setFlaggedSeats
    });
  };

  const drawSeat = (index) => (
    <Seat
      isLibrarian={false}
      index={index}
      selectedSeat={selectedSeat}
      timedWaitSeats={timedWaitSeats}
      occupiedSeats={occupiedSeats}
      flaggedSeats={flaggedSeats}
      handlePress={handlePress}
      timer={timer}
    />
  );

   const renderDialog = () => (
      <Dialog.Container visible={isDialogVisible}>
        <Dialog.Description style={styles.dialogTitle}>Claiming seat #{index}</Dialog.Description>
        <Dialog.Description>
          Do you want to claim seat #{index}?
        </Dialog.Description>
        <View style={styles.dialogButtonContainer}>
          <TouchableOpacity
            style={[styles.dialogButton, styles.dialogButtonCancel]}
            onPress={() => setIsDialogVisible(false)}
          >
            <Text style={styles.dialogButtonTextCancle}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dialogButton, styles.dialogButtonYes]}
            onPress={() => {
              claimSeat(ws, index, occupiedSeats, timedWaitSeats, flaggedSeats, setOccupiedSeats, setSelectedSeat, setTimedWaitSeats, setFlaggedSeats);
              setIsDialogVisible(false);
            }}
          >
            <Text style={styles.dialogButtonTextYes}>Yes</Text>
          </TouchableOpacity>
        </View>
      </Dialog.Container>
    );

  const drawTimer = () => (
    awayFromDesk()
      ? <Timer remainingTime={timer[selectedSeat]} />
      : <Text style={styles.timerText} />
  );

  const drawLeaveButton = () => (
    <Button
      label="Leave your seat"
      press={() => leaveSeat(ws, selectedSeat, timedWaitSeats, setTimedWaitSeats, flaggedSeats, occupiedSeats, setOccupiedSeats, setSelectedSeat, setFlaggedSeats)}
    />
  );

  const drawResumeButton = () => (
    <>
      <Text style={styles.selectedSeatText}>Your seat is Flagged!</Text>
      <Button
        label="Leave your seat"
        press={() => leaveSeat(ws, selectedSeat, timedWaitSeats, setTimedWaitSeats, flaggedSeats, occupiedSeats, setOccupiedSeats, setSelectedSeat, setFlaggedSeats)}
      />
      <Button label={"Return to seat"} press={() => claimSeat(ws, selectedSeat, occupiedSeats, timedWaitSeats, flaggedSeats, setOccupiedSeats, setSelectedSeat, setTimedWaitSeats, setFlaggedSeats)} />
    </>
  )

  const drawBreakButton = () => (
    awayFromDesk()
      ? <Button label={"Return from break"} press={() => claimSeat(ws, selectedSeat, occupiedSeats, timedWaitSeats, flaggedSeats, setOccupiedSeats, setSelectedSeat, setTimedWaitSeats, setFlaggedSeats)} />
      : <Button label={"Take a break"} press={() => breakSeat(ws, selectedSeat, timedWaitSeats, setTimedWaitSeats, timer, setTimer)} />
  )

 const drawCollectedButton = () => (

     <Button label={"Belongings collected"} press={() => setSelectedSeat(null)} />

 )
  // Top-Level JSX

  const drawHeader = () => (<>
    <Text style={styles.title}>Scan Your Seat</Text>
    <Text style={styles.selectedSeatText}>
      {hasSeat() ? `Selected Seat: ${selectedSeat}` : ""}
    </Text>
  </>);

//   const drawMap = () => (<>
//     {SeatInfo()}
//     <FlatList
//       data={Array(NUM_ROWS * SEATS_PER_ROW).fill(null)}
//       renderItem={({ index }) => drawSeat(index)}
//       keyExtractor={(item, index) => index.toString()}
//       numColumns={SEATS_PER_ROW}
//     />
//   </>);

  const drawMap = () => {
    const numRows = 3; // Number of rows
    const numCols = 2; // Number of columns per row
    const seatsPerRow = 3; // Total seats per row

    return (
      <>
        {SeatInfo()}
        <View style={{ alignItems: 'center', marginTop: 5 }}>
          <View style={{ position: 'relative', width: 100, height: 100, marginLeft: 100, marginTop: 20, marginBottom: 10}}>
            {renderCircularSeats()}
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 50 }}>
          {/* First FlatList */}
          <View style={{ marginRight: 10 }}>
            <FlatList
              data={Array(numRows * seatsPerRow).fill(null)}
              renderItem={({ index }) => drawSeat(index + 4)}
              keyExtractor={(item, index) => index.toString()}
              numColumns={seatsPerRow}
            />
          </View>

          {/* Gap */}
          <View style={{ width: 20 }} />

          {/* Second FlatList */}
          <View style={{ marginLeft: 10 }}>
            <FlatList
              data={Array(numRows * seatsPerRow).fill(null)}
              renderItem={({ index }) => drawSeat(index + 13)}
              keyExtractor={(item, index) => index.toString()}
              numColumns={seatsPerRow}
            />
          </View>

        </View>

      </>
    );
  };

  const renderCircularSeats = () => {
    const numSeats = 4; // Number of seats around the circular table
    const radius = 50; // Radius of the circular table
    const centerX = 50; // X-coordinate of the center of the circular table
    const centerY = 50; // Y-coordinate of the center of the circular table

    const seats = [];

    // Calculate positions around the circle
    for (let i = 0; i < numSeats; i++) {
      const angle = (i / numSeats) * 2 * Math.PI;
      const seatX = centerX + radius * Math.cos(angle);
      const seatY = centerY + radius * Math.sin(angle);

      seats.push(
        <View
          key={i}
          style={{
            position: 'absolute',
            left: seatX - 10,
            top: seatY - 10,
          }}
        >
          {drawSeat(i)}
        </View>
      );
    }

    return seats;
  };


  const drawFooter = () => {
    if (hasSeat()) {
      if (isFlagged()) {
        return (
          <View>
            {drawResumeButton()}
          </View>
        );
      } else {
        return (
          <View>
            {(selectedSeat !== null && isNowhere()) ? drawCollectedButton() : (
              <>
                {drawTimer()}
                {drawLeaveButton()}
                {drawBreakButton()}
              </>
            )}
          </View>
        );
      }
    } else {
      return (
        <QRButton press={() => navToCamera()} />
      );
    }

  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>{drawHeader()}</View>
      <View style={styles.map}>{drawMap()}</View>
      <View style={styles.footer}>{drawFooter()}</View>
      {renderDialog()}
    </View>
  );
};


export default Reserve;