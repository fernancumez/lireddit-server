import { RegisterInput } from '../resolvers/RegisterInput';

export const validateRegister = (options: RegisterInput) => {
  const validateEmail = (email: string) => {
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    return !!email && typeof email === 'string' && email.match(regexEmail);
  };

  if (options.username.length <= 2) {
    return [
      {
        field: 'username',
        message: 'length must be greater than 2',
      },
    ];
  }

  if (!validateEmail(options.email)) {
    return [
      {
        field: 'email',
        message: 'must be a valid email address',
      },
    ];
  }

  if (options.password.length <= 3) {
    return [
      {
        field: 'pasword',
        message: 'length must be greater than 3',
      },
    ];
  }

  return null;
};
