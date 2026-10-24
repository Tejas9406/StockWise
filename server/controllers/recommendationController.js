import {
  getRecommendations,
  handleManagerDecision,
  runOptimization,
} from './aiController.js';

export const getAllRecommendations = getRecommendations;

export const generateAutoRecommendations = runOptimization;

export const approveRecommendation = async (req, res, next) => {
  req.body = { ...req.body, decision: 'ACCEPTED' };
  return handleManagerDecision(req, res, next);
};

export const rejectRecommendation = async (req, res, next) => {
  req.body = { ...req.body, decision: 'REJECTED' };
  return handleManagerDecision(req, res, next);
};

export const editAndApproveRecommendation = async (req, res, next) => {
  req.body = { ...req.body, decision: 'EDITED', editedQuantity: req.body.quantity };
  return handleManagerDecision(req, res, next);
};

export const createRecommendation = async (req, res, next) => {
  return res.status(200).json({ success: true, message: 'Use AI optimization to generate recommendations.' });
};
