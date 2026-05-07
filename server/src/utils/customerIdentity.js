import crypto from 'crypto';

const codePrefix = 'WK';

const randomCodePart = () => crypto.randomBytes(4).toString('hex').toUpperCase();

export const generateCustomerCode = () => `${codePrefix}${randomCodePart()}`;

export const ensureCustomerCode = async (user) => {
  if (!user || user.customerCode) return user?.customerCode || '';

  const UserModel = user.constructor;
  let nextCode = generateCustomerCode();

  while (await UserModel.exists({ customerCode: nextCode, _id: { $ne: user._id } })) {
    nextCode = generateCustomerCode();
  }

  user.customerCode = nextCode;
  await user.save();
  return nextCode;
};

export const buildCustomerQrValue = (user) => String(user?.customerCode || '').trim();
