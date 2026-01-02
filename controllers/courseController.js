const fs = require('fs');
const path = require('path');
const Registration = require('../models/registrationModel');
const Post = require('../models/postModel');
const mailer = require('../config/mailer'); // add mailer

// Debug log
console.log('Loading courseController');

exports.showRegistrationForm = async (req, res) => {
    try {
        const course = await Post.findById(req.params.id)
            .populate('category')
            .populate('user');
        
        if (!course) {
            return res.status(404).render('error', { message: 'Course not found' });
        }

        res.render('course-registration', { 
            course,
            user: req.session.user
        });
    } catch (err) {
        console.error('Registration form error:', err);
        res.status(500).render('error', { message: 'Error loading registration page' });
    }
};

exports.registerCourse = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const courseId = req.params.id;
        const userId = req.session.user._id;

        const existingRegistration = await Registration.findOne({
            course: courseId,
            user: userId
        });

        if (existingRegistration) {
            return res.render('course-registration', {
                course: await Post.findById(courseId),
                error: 'You are already registered for this course',
                user: req.session.user
            });
        }

        await Registration.create({
            course: courseId,
            user: userId,
            status: 'confirmed',
            registrationDate: new Date()
        });

        // Send emails (user + admin). Do not block redirect if email fails.
        try {
            const course = await Post.findById(courseId);
            await mailer.sendAllOnCourseRegistration({ user: req.session.user, course });
        } catch (mailErr) {
            console.warn('Course registration email failed:', mailErr?.message || mailErr);
        }

        res.redirect(`/course/view/${courseId}?registration=success`);
    } catch (err) {
        console.error('Course registration error:', err);
        res.status(500).render('error', { message: 'Error registering for course' });
    }
};

exports.getSingleCourse = async (req, res) => {
    try {
        const course = await Post.findById(req.params.id)
            .populate('category')
            .populate('user');
        
        if (!course) {
            return res.status(404).render('error', { message: 'Course not found' });
        }

        res.render('single', { 
            singlePost: course,
            user: req.session.user || null 
        });
    } catch (err) {
        console.error('Get course error:', err);
        res.status(500).render('error', { message: 'Error loading course' });
    }
};
