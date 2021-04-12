import { AxiosResponse } from 'axios';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const cartItemName = "@RocketShoes:cart"

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(cartItemName)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {

      const productStock = await getStockByProductId(productId)
      const productStoraged = cart.find(productStorage => productStorage.id === productId)

      if(productStoraged && productStoraged.amount == productStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const product: Product  = (await api.get(`products/${productId}`)).data
      
      if(!product){
        throw new Error()
      }

      let newCart = [];

      if(!productStoraged){
        product.amount = 1;
        newCart = [...cart, product]
      }else{
        newCart = cart.map(productStorage => {
          if(productStorage.id !== productId) return productStorage
          productStorage.amount += 1
          return productStorage;
        })
      }

      setCart(newCart)
      localStorage.setItem(cartItemName, JSON.stringify(newCart))

    } catch(error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productStoraged = cart.find(productStorage => productStorage.id === productId)

      if(!productStoraged){
        throw new Error()
      }

      const newCart = cart.filter(productStorage => productStorage.id !== productId)
      setCart(cart.filter(productStorage => productStorage.id !== productId))
      localStorage.setItem(cartItemName, JSON.stringify(newCart))
    } catch(error) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0) return;

      const productStock = await getStockByProductId(productId)

      if(amount > productStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(productStorage => {
        if(productStorage.id !== productId) return productStorage
        productStorage.amount = amount
        return productStorage;
      })

      setCart(newCart)
      localStorage.setItem(cartItemName, JSON.stringify(newCart))
    } catch(error) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const getStockByProductId = async (productId: number): Promise<Stock> => {
    return (await api.get(`stock/${productId}`)).data
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
