import * as ticketService from '../services/ticket.service.js';

export async function listTickets(req, res, next) {
  try {
    const tickets = await ticketService.listTickets({ user: req.user, query: req.query });
    res.json({ success: true, tickets });
  } catch (err) { next(err); }
}

export async function getTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicket({ id: req.params.id, user: req.user });
    res.json({ success: true, ticket });
  } catch (err) { next(err); }
}

export async function createTicket(req, res, next) {
  try {
    const ticket = await ticketService.createTicket({ user: req.user, data: req.body });
    res.status(201).json({ success: true, ticket });
  } catch (err) { next(err); }
}

export async function updateTicket(req, res, next) {
  try {
    const ticket = await ticketService.updateTicket({ id: req.params.id, user: req.user, data: req.body });
    res.json({ success: true, ticket });
  } catch (err) { next(err); }
}

export async function deleteTicket(req, res, next) {
  try {
    await ticketService.deleteTicket({ id: req.params.id, user: req.user });
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (err) { next(err); }
}

export async function changeStatus(req, res, next) {
  try {
    const { status, stuckReason } = req.body;
    const ticket = await ticketService.changeStatus({ id: req.params.id, user: req.user, status, stuckReason });
    res.json({ success: true, ticket });
  } catch (err) { next(err); }
}

export async function createRecurringSeries(req, res, next) {
  try {
    const result = await ticketService.createRecurringSeries({ user: req.user, data: req.body });
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function addNextOccurrence(req, res, next) {
  try {
    const ticket = await ticketService.addNextOccurrence({ ticketId: req.params.id, user: req.user });
    res.status(201).json({ success: true, ticket });
  } catch (err) { next(err); }
}

export async function getSeriesSiblings(req, res, next) {
  try {
    const tickets = await ticketService.getSeriesSiblings(req.params.id);
    res.json({ success: true, tickets });
  } catch (err) { next(err); }
}

