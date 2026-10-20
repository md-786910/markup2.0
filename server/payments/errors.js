class PaymentProviderUnavailableError extends Error {
  constructor() {
    super("We're facing payment issues. Please try again later.");
    this.name = 'PaymentProviderUnavailableError';
    this.statusCode = 503;
  }
}

class PaymentVerificationError extends Error {
  constructor(message) {
    super(message || 'Payment verification failed.');
    this.name = 'PaymentVerificationError';
    this.statusCode = 400;
  }
}

module.exports = {
  PaymentProviderUnavailableError,
  PaymentVerificationError,
};
