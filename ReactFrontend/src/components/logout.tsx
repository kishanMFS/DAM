import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


useEffect( () => {
    const navigate = useNavigate();
    navigate('/logout')
}, [])