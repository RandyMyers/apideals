const PaymentLink = require('../models/paymentLink');

exports.createPaymentLink = async (req, res) => {
    try {
      const { planId, paymentMethod, details, isActive } = req.body;
  
      // Create a new PaymentLink document
      const paymentLink = new PaymentLink({
        planId,
        paymentMethod,
        details,
        isActive: isActive || true,
      });
  
      const savedPaymentLink = await paymentLink.save();
  
      res.status(201).json(savedPaymentLink);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }; 
  
  exports.getAllPaymentLinks = async (req, res) => {
    try {
      const paymentLinks = await PaymentLink.find().populate('planId', 'name description');
      res.status(200).json(paymentLinks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  exports.getPaymentLinkById = async (req, res) => {
    try {
      const paymentLink = await PaymentLink.findById(req.params.id).populate('planId', 'name description');
      if (!paymentLink) {
        return res.status(404).json({ message: 'Payment Link not found' });
      }
      res.status(200).json(paymentLink);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  exports.updatePaymentLink = async (req, res) => {
    try {
      const { planId, paymentMethod, details, isActive } = req.body;
  
      const paymentLink = await PaymentLink.findByIdAndUpdate(req.params.id, {
        planId,
        paymentMethod,
        details,
        isActive,
        updatedAt: Date.now(),
      }, { new: true });
  
      if (!paymentLink) {
        return res.status(404).json({ message: 'Payment Link not found' });
      }
  
      res.status(200).json(paymentLink);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  exports.deletePaymentLink = async (req, res) => {
    try {
      const paymentLink = await PaymentLink.findByIdAndDelete(req.params.id);
  
      if (!paymentLink) {
        return res.status(404).json({ message: 'Payment Link not found' });
      }
  
      res.status(204).json();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  