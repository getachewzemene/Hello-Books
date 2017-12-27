import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import omit from 'lodash/omit';
import database from '../models';

dotenv.load();
const secret = process.env.secretKey;

const { User } = database;
export default {

  /** 
   * @description - Adds a new use to the database
   * 
   * @param  {object} req request object
   * 
   * @param  {object} res response object
   * 
   * @return {Object} - Object containing user detail
   * 
   * Route: POST: /users/signup
   */
  create(req, res) {
    return User.create(req.userInput)
      .then((user) => {
        const currentUser = omit(user.dataValues,
          ['password', 'createdAt', 'updatedAt']);
        const token = jwt.sign(
          {
            currentUser,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
          },
          secret
        );
        return res.status(201).send({
          message: 'Signed up successfully',
          token
        });
      })
      .catch(error => res.status(500).send(error));
  },

  /** 
   * @description - Authenticates user login information
   * 
   * @param  {object} req - request
   * 
   * @param  {object} res - response 
   * 
   * @return {Object} - Object containing user details
   * 
   * Route: POST: /users/signin
   */
  login(req, res) {
    if (!req.body.username || !req.body.password) {
      return res.status(401).json({
        message: 'Please provide your username or password to login'
      });
    }
    User.findOne({
      where: {
        username: req.body.username
      }
    })
      .then((user) => {
        if (user && bcrypt.compareSync(req.body.password, user.password)) {
          const currentUser = omit(user.dataValues,
            ['password', 'createdAt', 'updatedAt']);
          const token = jwt.sign(
            {
              currentUser,
              exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
            },
            secret
          );
          return res.status(200).send({
            message: 'Logged In Successfully',
            token
          });
        }
        return res.status(401).json({
          message: 'Invalid Credentials.'
        });
      })
      .catch(error => res.status(500).send(error));
  },

  /**
   * 
   * @description - Edit profile controller
   * 
   * @param {Object} req - request
   * 
   * @param {Object} res - response
   * 
   * @returns {Object} - Object containing status code and success message
   */
  editProfile(req, res) {
    const userData = {
      email: req.body.email,
      fullName: req.body.fullName
    }
    return User.update(userData, {
      where: {
        id: req.params.userId
      }
    })
      .then(() => {
        User.findById(req.params.userId)
          .then((user) => {
            const currentUser = omit(user.dataValues,
              ['password', 'createdAt', 'updatedAt']);
            const token = jwt.sign(
              {
                currentUser,
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
              },
              secret
            );
            res.status(200).send({
              message: 'Profile updated successfully',
              token
            });
          });
      })
      .catch(error => res.status(500).send(error));
  }
};
