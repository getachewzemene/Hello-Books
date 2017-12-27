import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import omit from 'lodash/omit';
import database from '../models/';

dotenv.load();

const key = process.env.secretKey;
const { User } = database;
const { RentedBook } = database;

const Authorization =  {

  /** 
   * @description - Validates users login information
   * 
   * @param  {Object} req - request
   *
   * @param  {Object} res - response
   *
   * @param  {Object} next - calls the next method
   *
   * @return {Object} - Response message
   */
  validateLogin(req, res, next) {
    if (!req.body.username || !req.body.password) {
      return res.status(401).json({
        message: 'Please provide your username or password to login'
      });
    }
    User.findOne({
      where: {
        username: req.body.username
      }
    }).then((user) => {
      if (user && bcrypt.compareSync(req.body.password, user.password)) {
        next();
      } else {
        return res.status(401).json({
          message: 'Invalid Credentials.'
        });
      }
    });
  },

  /** 
   * @description - Checks if logged in user has valid AUTH token
   * 
   * @param  {Object} req - request
   * 
   * @param  {object} res - response
   * 
   * @param {Object} next - Call back function
   * 
   * @return {null} - null
   */
  isLoggedIn(req, res, next) {
    let token;
    const tokenAvailable = req.headers.authorization ||
    req.headers['x-access-token'];

    if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    } else {
      token = tokenAvailable;
    }
    if (token) {
      jwt.verify(token, key, (error, decoded) => {
        if (error) {
          res.status(401).send({
            message: 'Failed to Authenticate Token',
            error
          });
        } else {
          req.decoded = decoded;
          next();
        }
      });
    } else {
      return res.status(401).send({
        message: 'Access denied, Authentication token does not exist'
      });
    }
  },
  /** 
   * @description - Checks if currently logged in user is an admin
   * 
   * @param  {Object} req - request
   * 
   * @param  {object} res - response
   * 
   * @param {Object} next - Call back function
   * 
   * @return {Object} - Object containing message
   */
  isAdmin(req, res, next) {
    const decodedToken = req.decoded;
    if (typeof decodedToken.currentUser.isAdmin === 'undefined') {
      return res.status(403).send({
        message: 'You do not have permission to perform that operation'
      });
    } else if (decodedToken.currentUser.isAdmin) {
      next();
    } else {
      return res.status(403).send({
        message: 'You do not have permission to perform that operation'
      });
    }
  },

  /** 
   * @description - Checks if user has rented a book before
   * 
   * @param  {Object} req - request
   * 
   * @param  {object} res - response
   * 
   * @param {Object} next - Call back function
   * 
   * @return {Object} - Object containing message
   */
  hasRentedBefore(req, res, next) {
    RentedBook.findOne({
      where: {
        bookId: req.body.bookId,
        userId: req.params.userId,
        returned: false
      }
    }).then((books) => {
      if (books) {
        res.status(403).send({
          message: 'You have rented that book before'
        });
      } else {
        next();
      }
    });
  },

  /**
   * 
   * @description - Gets user data from the database
   * 
   * @param {Object} req - request
   *
   * @param {Object} res - response
   *
   * @returns {String} JWT Token
   */
  getOneUser(req, res) {
    return User.findById(req.params.userId)
      .then((user) => {
        const currentUser = omit(user.dataValues,
          ['password', 'createdAt', 'updatedAt']);

        const token = jwt.sign({
          currentUser,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) },
        key);

        return res.status(201).send({
          token
        });
      })
      .catch(error => res.status(404).send(error));
  },

  /**
   * @description - Check the rentedbook limit limit
   * 
   * @param {Object} req - request
   *
   * @param {Object} res - response
   *
   * @param {Object} next - callBack function
   *
   * @return {Object} - Object
   */
  checkUserPlan(req, res, next) {
    if (/[\D]/g.test(req.params.userId)) {
      return res.status(400).send({
        message: 'Invalid user id supplied!!!'
      });
    } else if (/[\D]/g.test(req.body.bookId)) {
      return res.status(400).send({
        message: 'Invalid book id supplied!!!'
      });
    }
    const message = `You are not permitted to 
   borrow more books, please return the ones you have 
   borrowed or upgrade your plan.`;

    RentedBook.findAndCount({
      where: {
        userId: req.params.userId,
        returned: false
      }
    }).then((rented) => {
      const { plan } = req.decoded.currentUser;
        if (plan === 'Silver' && rented.count === 5) {
          res.status(403).send({
            message
          });
        } else if (plan === 'Diamond' && rented.count === 20) {
          res.status(403).send({
            message
          });
        } else if (plan === 'Gold' && rented.count === 50) {
          res.status(403).send({
            message: 'Book limit reached, return previously borrowed'
          });
        } else {
          next();
        }
      });
  },

  /**
   * @description -  Get users by email address
   * 
   * @param {Object} req - request
   *
   * @param {Object} res - response
   *
   * @returns {Object} - Object containg token
   */
  getUserByEmail(req, res) {
    return User.findOne({
      where: {
        email: req.body.email
      }
    })
      .then((user) => {
        const currentUser = {
          userId: user.id,
          username: user.username
        };
        const token = jwt.sign({
          currentUser,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) },
        key);

        return res.status(201).send({
          token
        });
      })
      .catch(error => res.status(404).send(error));
  }
};

export default Authorization;
