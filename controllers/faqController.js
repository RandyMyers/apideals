const FAQ = require('../models/faq');

// Get all FAQs (public)
exports.getAllFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ isPublished: true })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all FAQs (admin - includes drafts)
exports.getAllFAQsAdmin = async (req, res) => {
  try {
    const faqs = await FAQ.find()
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs (admin):', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get FAQs by category (public)
exports.getFAQsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const faqs = await FAQ.find({ isPublished: true, category })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ faqs });
  } catch (error) {
    console.error('Error fetching FAQs by category:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single FAQ by ID (public)
exports.getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    // Increment views
    faq.views += 1;
    await faq.save();

    return res.status(200).json({ faq });
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new FAQ (admin)
exports.createFAQ = async (req, res) => {
  try {
    const { question, questionTranslations, answer, answerTranslations, category, order, isPublished } = req.body;

    // Parse translation objects if they come as strings
    let parsedQuestionTranslations = questionTranslations;
    if (typeof questionTranslations === 'string') {
      try {
        parsedQuestionTranslations = JSON.parse(questionTranslations);
      } catch (e) {
        parsedQuestionTranslations = {};
      }
    }

    let parsedAnswerTranslations = answerTranslations;
    if (typeof answerTranslations === 'string') {
      try {
        parsedAnswerTranslations = JSON.parse(answerTranslations);
      } catch (e) {
        parsedAnswerTranslations = {};
      }
    }

    const faq = new FAQ({
      question,
      questionTranslations: parsedQuestionTranslations || {},
      answer,
      answerTranslations: parsedAnswerTranslations || {},
      category: category || 'general',
      order: order || 0,
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    await faq.save();
    return res.status(201).json({ message: 'FAQ created successfully', faq });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a FAQ by ID (admin)
exports.updateFAQ = async (req, res) => {
  try {
    const { question, questionTranslations, answer, answerTranslations, category, order, isPublished } = req.body;

    // Parse translation objects if they come as strings
    let parsedQuestionTranslations = questionTranslations;
    if (typeof questionTranslations === 'string') {
      try {
        parsedQuestionTranslations = JSON.parse(questionTranslations);
      } catch (e) {
        parsedQuestionTranslations = {};
      }
    }

    let parsedAnswerTranslations = answerTranslations;
    if (typeof answerTranslations === 'string') {
      try {
        parsedAnswerTranslations = JSON.parse(answerTranslations);
      } catch (e) {
        parsedAnswerTranslations = {};
      }
    }

    // Get existing FAQ to merge translations
    const existingFAQ = await FAQ.findById(req.params.id);
    if (!existingFAQ) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    const updates = {
      question: question !== undefined ? question : existingFAQ.question,
      questionTranslations: parsedQuestionTranslations
        ? { ...existingFAQ.questionTranslations, ...parsedQuestionTranslations }
        : existingFAQ.questionTranslations,
      answer: answer !== undefined ? answer : existingFAQ.answer,
      answerTranslations: parsedAnswerTranslations
        ? { ...existingFAQ.answerTranslations, ...parsedAnswerTranslations }
        : existingFAQ.answerTranslations,
      category: category !== undefined ? category : existingFAQ.category,
      order: order !== undefined ? order : existingFAQ.order,
      isPublished: isPublished !== undefined ? isPublished : existingFAQ.isPublished,
      updatedAt: Date.now(),
    };

    const faq = await FAQ.findByIdAndUpdate(req.params.id, updates, { new: true });

    return res.status(200).json({ message: 'FAQ updated successfully', faq });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a FAQ by ID (admin)
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);

    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    return res.status(200).json({ message: 'FAQ deleted successfully', faq });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

