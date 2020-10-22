const express = require('express');
const { deleteNotes } = require('../../common/note');
const { getUser } = require('../../common/user');

const lib = require('../../lib');
const auth = require('../../middleware/auth');
const Note = require('../../models/Note');
const User = require('../../models/User');
const { update } = require('../../validation/userValidation');

const router = express.Router();

/**
 * Get a user's details
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, payload: { message: 'Cannot find account' } });
    }
    return res.json({
      success: true,
      payload: getUser(user),
    });
  } catch (err) {
    console.log('ERROR - user.js - get - user: ', err);
    return res
      .status(500)
      .json({ success: false, payload: { message: 'Internal server error' } });
  }
});

// User delete
router.delete('/', auth, lib.validateUser, async (req, res) => {
  try {
    const notes = await Note.findAll({ where: { userId: req.user.id } });

    const noteIds = notes.map(({ id }) => id);

    if (noteIds.length >= 1) {
      const hasDeletedNotes = await deleteNotes(noteIds, req.user.id);
      if (!hasDeletedNotes) {
        return res.status(500).json({
          success: false,
          payload: { message: 'Server error: failed to delete notes' },
        });
      }
    }

    const user = await User.findOne({ where: { id: req.user.id } });

    await user.destroy();

    return res.status(200).json({ success: true, payload: getUser(user) });
  } catch (err) {
    console.log('ERROR - user.js - delete - user: ', err);
    return res
      .status(500)
      .json({ success: false, payload: { message: 'Internal server error' } });
  }
});

// Update password
router.put('/', auth, lib.validateUser, async (req, res) => {
  const { error } = update.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }
  const { username, email } = req.body;
  try {
    const userUsername = await User.findOne({ where: { username } });

    if (userUsername) {
      return res.status(400).json({
        success: false,
        payload: { message: 'Username already exists' },
      });
    }

    const user = await User.findOne({ where: { id: req.user.id } });

    const updatedUser = await user.update({ username, email });

    return res.status(200).json({ success: true, payload: getUser(updatedUser) });
  } catch (err) {
    console.log('ERROR - user.js - put - user: ', err);
    return res
      .status(500)
      .json({ success: false, payload: { message: 'Internal server error' } });
  }
});

module.exports = router;
