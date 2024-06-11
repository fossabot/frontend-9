import { Alert } from 'react-native';
import { OCCUPIED_API, CLAIM_API, LEAVE_API, BREAK_API, UNBREAK_API } from './Constants'

const flagSeat = (index: number, flaggedSeats: number[], setFlaggedSeats: Function) => {
    if (!flaggedSeats.includes(index))
        setFlaggedSeats([...flaggedSeats, index]);

    console.log(flaggedSeats);
    Alert.alert('Notification Sent', 'Notification to the owner has been sent.');
};

const claimSeat = async (
    index: number,
    occupiedSeats: number[],
    timedWaitSeats: number[],
    setOccupiedSeats: Function,
    setSelectedSeat: Function,
    setTimedWaitSeats: Function
) => {
    if (occupiedSeats.includes(index)) {
        try {
            const response = await fetch(UNBREAK_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ seat_number: index.toString() }),
            });
            if (!response.ok) {
                throw new Error('Failed to unbreak seat');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while unbreaking the seat.');
        }
        setTimedWaitSeats(timedWaitSeats.filter(seat => seat !== index));
        setSelectedSeat(index); // Select the seat
        return;
    }
    try {
        const response = await fetch(CLAIM_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seat_number: index.toString() }),
        });
        if (response.ok) {
            // Fetch updated list of occupied seats
            const updatedResponse = await fetch(OCCUPIED_API);
            if (!updatedResponse.ok) {
                throw new Error('Failed to fetch updated occupied seats');
            }
            const data = await updatedResponse.json();
            const updated = data.results.map(item => parseInt(item.seat_number));
            setOccupiedSeats(updated);
            console.log("setting seat!")
            setSelectedSeat(index);  // Set the selected seat
        } else {
            Alert.alert('Error', 'Failed to claim seat.');
        }
    } catch (error) {
        console.error(error);
        Alert.alert('Error', 'An error occurred while claiming the seat.');
    }
};

const leaveSeat = async (
    index: number,
    timedWaitSeats: number[],
    setTimedWaitSeats: Function,
    occupiedSeats: number[],
    setOccupiedSeats: Function,
    setSelectedSeat: Function
) => {
    if (timedWaitSeats.includes(index))
        setTimedWaitSeats(timedWaitSeats.filter(seat => seat !== index));

    if (occupiedSeats.includes(index)) {
        try {
            const response = await fetch(LEAVE_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ seat_number: index.toString() }),
            });
            if (response.ok) {
                // Fetch updated list of occupied seats
                const updatedResponse = await fetch(OCCUPIED_API);
                if (!updatedResponse.ok) {
                    throw new Error('Failed to fetch updated occupied seats');
                }
                const data = await updatedResponse.json();
                const updated = data.results.map(item => parseInt(item.seat_number));
                setOccupiedSeats(updated);
                setSelectedSeat(null);  // Reset selected seat
            } else {
                Alert.alert('Error', 'Failed to leave seat.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while claiming the seat.');
        }
    }
};

const breakSeat = async (
    index: number,
    timedWaitSeats: number[],
    setTimedWaitSeats: Function,
    timer: { [key: number]: number },
    setTimer: Function
) => {
    setTimedWaitSeats([...timedWaitSeats, index]);
    setTimer({ ...timer, [index]: 120 }); // 2 minutes = 120 seconds

    try {
        const response = await fetch(BREAK_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seat_number: index.toString() }),
        });
        if (response.ok) {
            setTimedWaitSeats([...timedWaitSeats, index]);
            setTimer({ ...timer, [index]: 120 }); // 2 minutes = 120 seconds
        } else {
            Alert.alert('Error', 'Failed to break seat.');
        }
    
    } catch (error) {
        console.error(error);
        Alert.alert('Error', 'An error occurred while breaking the seat.');
    }
};

export { flagSeat, claimSeat, leaveSeat, breakSeat };
