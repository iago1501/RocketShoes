import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const stockItem = async (productId: number) => {
    const stock = await api.get<Stock>(`/stock/${productId}`);

    return stock.data.amount;
  };

  const isProductInCart = (productId: number) => {
    return cart.find(({ id }) => id === productId);
  };

  const updateCart = (updatedCart: Product[]) => {
    setCart(updatedCart);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const productInCart = isProductInCart(productId);

      const stockAmount = await stockItem(productId);
      const currentAmount = productInCart ? productInCart.amount : 0;
      const desiredAmout = currentAmount + 1;

      if (desiredAmout > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productInCart) {
        updateProductAmount({
          productId: productInCart.id,
          amount: desiredAmout,
        });
        return;
      } else {
        const productResponse = await api.get<Product>(
          `/products/${productId}`
        );
        const product = productResponse.data;
        const updatedCart = [...cart, { ...product, amount: 1 }];
        updateCart(updatedCart);
        return;
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = isProductInCart(productId);

      if (!productInCart) {
        throw Error();
      }

      const cartWithoutProductRemoved = cart.filter((product) =>
        product.id !== productId ? product : null
      );

      updateCart(cartWithoutProductRemoved);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await stockItem(productId);

      if (amount > stock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productInCart = isProductInCart(productId);

      if (productInCart) {
        //update product
        const updatedCart = cart.map((product) =>
          product.id === productId ? { ...product, amount } : product
        );
        updateCart(updatedCart);
        
      } else {
        throw Error();
      }      
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

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
