import { Alert } from 'react-native';

const OCCUPIED_API = "https://libraryseat-62c310e5e91e.herokuapp.com/";
const CLAIM_API = "https://libraryseat-62c310e5e91e.herokuapp.com/claim";
const LEAVE_API = "https://libraryseat-62c310e5e91e.herokuapp.com/leave";
const FLAG_API = "https://libraryseat-62c310e5e91e.herokuapp.com/flag";
const UNFLAG_API = "https://libraryseat-62c310e5e91e.herokuapp.com/unflag";

const flagSeat = async (index: number, flaggedSeats: number[], setFlaggedSeats: Function) => {
    if (!flaggedSeats.includes(index)) {
        try {
            const response = await fetch(FLAG_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({seat_number: index.toString()}),
            });
            if (response.ok) {
                setFlaggedSeats([...flaggedSeats, index]);
            } else {
                Alert.alert('Error', 'Failed to flag seat.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while flagging the seat.');
        }
    }
    console.log(flaggedSeats);
};

const unflagSeat = async (index: number, flaggedSeats: number[], setFlaggedSeats: Function) => {
    if (!flaggedSeats.includes(index)) {
        try {
            const response = await fetch(UNFLAG_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({seat_number: index.toString()}),
            });
            if (response.ok) {
                const updatedResponse = await fetch(FLAG_API);
                if (!updatedResponse.ok) {
                    throw new Error('Failed to get updated flagged seats');
                }
                const data = await updatedResponse.json();
                const updated = data.results.map(item => parseInt(item.seatNumber));
                setFlaggedSeats(updated);
            } else {
                Alert.alert('Error', 'Failed to unflag seat.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while unflagging the seat.');
        }
    }
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

const breakSeat = (
    index: number,
    timedWaitSeats: number[],
    setTimedWaitSeats: Function,
    timer: { [key: number]: number },
    setTimer: Function
) => {
    setTimedWaitSeats([...timedWaitSeats, index]);
    setTimer({ ...timer, [index]: 120 }); // 2 minutes = 120 seconds
};

export { flagSeat, unflagSeat, claimSeat, leaveSeat, breakSeat };
