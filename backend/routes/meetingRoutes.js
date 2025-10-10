import express from 'express';
import {
    createMeeting,
    joinMeeting,
    getMeeting,
    getUserMeetings,
    endMeeting
} from '../controllers/meetingController.js';

const router = express.Router();

// Create a new meeting
router.post('/create', createMeeting);

// Join an existing meeting
router.post('/join/:meetingId', joinMeeting);

// Get meeting details
router.get('/:meetingId', getMeeting);

// Get user's meetings (hosted or participating)
router.get('/user/meetings', getUserMeetings);

// End a meeting (host only)
router.patch('/end/:meetingId', endMeeting);

export default router;