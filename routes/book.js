const router = require('express').Router()
const jwt = require('jsonwebtoken')
const Book = require('../models/book')
const Ledger = require('../models/ledger')
const logger = require('../config/logger')
const { authinticateToken } = require('../helper/auth.helper')


//Creating a book
router.post('/', async (req, res) => {
    const book = new Book(req.body)
    try {
        logger.info('Adding a new book ', { book: req.body })
        await book.save()
        res.status(201).send(book)
    } catch (error) {
        logger.error('Failed to add book', {error})
        res.status(500).send(error)
    }
})

//Get all the books
router.get('/', authinticateToken,async (req, res) => {

    const query = req.query;
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '2');
    try {
        
        logger.info("Fetching information of all books")
        const books = await Book.find().sort({ createdAt: 'desc' }).limit(limit).skip((page-1)*limit)
        const count = await Book.countDocuments()
        res.send({totlaCount: count,books:books})
    } catch (error) {
        logger.error("Failed to fetch information of all books")
        res.status(500).send(error)
    }
})

//Get a book by id
router.get('/:id', authinticateToken, async (req, res) => {
    const _id = req.params.id
    try {   
        const book = await Book.findById(_id)
        if (!book) {
            return res.status(404).send({error: 'There is no boook for this id'})
        }
        logger.info("Fetching information of book by id")
        res.send(book)
    } catch (error) {
        logger.error("Failed to fetch book by id")
        res.status(500).send({error: 'Check the id of the book'})
    }
})

//Update a book by id
router.patch('/:id', authinticateToken, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'author', 'status', 'updatedBy', 'updatedAt']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    
    if (!isValidOperation) {
        return res.status(400).send({error: 'Invalid updates!!'})
    }

    try {
        const bookToUpdate = {
            ...req.body,
            updatedAt: Date.now()
        }
        const book = await Book.findByIdAndUpdate(req.params.id, bookToUpdate, {new: true, runValidators: true})
        if (!book) {
            return res.status(404).send({error: 'There is no boook for this id'})
        }
        logger.info("Updating book information,,,,,")
        res.send(book)
    } catch (error) {
        logger.error("Failed to update book by id")
        res.status(500).send({error: 'Check the id of the book'})
    }
    
})

//Delete a book by id
router.delete('/:id', authinticateToken, async (req, res) => {
    try {
        const bookId = req.params.id
        const book =  await Book.findByIdAndDelete(bookId)
        if (!book) {
            return res.status(404).send({error: 'There is no boook for this id'})
        }
        logger.info("Deleting a book by id,,,,")
        res.send(book)
    } catch (error) {
        logger.error("Failed to delete book by id")
        res.status(500).send({error: 'Check the id of the book'})
    }
}) 

//Checkout a book by id
router.patch('/:bookId/checkout/:userId', authinticateToken, async (req, res) => {
    const params = req.params
    const bookId = params.bookId
    const userId = params.userId
    
    try {
        const book = await Book.findById(bookId)
        if (!book) {
            return res.status(404).send({message: "There is no book for this id"})
        }
        if (book.status !== "AVAILABLE") {
            const err = {
                message: "Book is unavialble"
            }
            return res.status(400).send(err) 
        } 
        book.status = "UNAVAILABLE"
        book.updatedBy = userId
        await book.save()

        const ledger = new Ledger()
        ledger.status = "CHECKOUT"
        ledger.bookId = bookId
        ledger.userId = userId
        await ledger.save()
        
        const response = {
            book: book,
            ledger: ledger
        }
        logger.info("Checkout a book by id")
        res.send(response)
    
    } catch (error) {
        logger.error("Failed to checkout book by id")
        res.status(500).send(error)
    }
    
})

//return a book by id
router.patch('/:bookId/return/:userId', authinticateToken, async (req, res) => {
    const params = req.params
    const bookId = params.bookId
    const userId = params.userId
    try {
        const book = await Book.findById(bookId)
        if (!book) {
            return res.status(404).send({message: "There is no book for this id"})
        }
        if (book.status === "AVAILABLE") {
            return res.status(400).send({message: "At present no one has taken the book"})
        }
        book.status = "AVAILABLE"
        book.updatedBy = userId
        await book.save()

        const ledger = new Ledger()
        ledger.status = "RETURN"
        ledger.bookId = bookId
        ledger.userId = userId
        await ledger.save()

        const response = {
            book: book,
            ledger: ledger
        }
        logger.info("Return a book by id")
        res.send(response)
    } catch (error) {
        logger.error("Failed to return a book by id")
        res.status(500).send(error)
    }
})

module.exports = router